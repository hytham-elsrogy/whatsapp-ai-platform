import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MetaApiError, MetaService } from '@/modules/meta/meta.service';
import { WhatsappNumbersService } from '@/modules/whatsapp-numbers/whatsapp-numbers.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { ConversationsService } from '@/modules/conversations/conversations.service';
import { MessagesService } from '@/modules/messages/messages.service';
import { Message, MessageStatusValue } from '@/modules/messages/entities/message.entity';
import { AssignmentService } from '@/modules/assignment/assignment.service';
import { ChatbotService } from '@/modules/chatbot/chatbot.service';
import { ChatbotFlowsService } from '@/modules/chatbot/chatbot-flows.service';
import { AiService } from '@/modules/ai-agents/ai.service';
import { TemplatesService } from '@/modules/templates/templates.service';
import { TemplateStatus } from '@/modules/templates/entities/template.entity';
import { EventsGateway } from '@/modules/realtime/events.gateway';
import { ComplianceService, ComplianceCheckError } from '@/modules/compliance/compliance.service';
import { ConsentsService } from '@/modules/consents/consents.service';
import { AttachmentsService } from '@/modules/uploads/attachments.service';
import { Conversation } from '@/modules/conversations/entities/conversation.entity';

const MEDIA_MESSAGE_TYPES = ['image', 'document', 'audio', 'video'] as const;
type MediaMessageType = (typeof MEDIA_MESSAGE_TYPES)[number];

interface MetaWebhookBody {
  object?: string;
  entry?: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        metadata?: { phone_number_id: string };
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          interactive?: {
            type: 'button_reply' | 'list_reply';
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
          };
          [key: string]: unknown;
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
        // Present only on `field: "message_template_status_update"` entries.
        message_template_id?: string;
        event?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'FLAGGED' | 'PAUSED' | 'DISABLED';
      };
    }>;
  }>;
}

const META_TEMPLATE_EVENT_TO_STATUS: Record<string, TemplateStatus> = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const META_TO_INTERNAL_STATUS: Record<string, MessageStatusValue> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly metaService: MetaService,
    private readonly whatsappNumbersService: WhatsappNumbersService,
    private readonly customersService: CustomersService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly assignmentService: AssignmentService,
    private readonly chatbotService: ChatbotService,
    private readonly chatbotFlowsService: ChatbotFlowsService,
    private readonly aiService: AiService,
    private readonly templatesService: TemplatesService,
    private readonly eventsGateway: EventsGateway,
    private readonly complianceService: ComplianceService,
    private readonly consentsService: ConsentsService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  async sendText(
    tenantId: string,
    conversationId: string,
    text: string,
    actor: { type: Message['senderType']; id?: string },
  ): Promise<Message> {
    const conversation = await this.conversationsService.findOne(tenantId, conversationId);

    if (!this.conversationsService.isWithinServiceWindow(conversation)) {
      throw new BadRequestException(
        'Customer Service Window Expired — a freeform message cannot be sent; use an approved template instead.',
      );
    }

    const whatsappNumber = await this.whatsappNumbersService.findById(conversation.whatsappNumberId);

    try {
      await this.complianceService.runPreSendChecks({
        customerId: conversation.customerId,
        phoneNumberId: whatsappNumber.phoneNumberId,
        conversationId,
        text,
      });
    } catch (error) {
      if (error instanceof ComplianceCheckError) throw new BadRequestException(error.message);
      throw error;
    }

    const accessToken = this.whatsappNumbersService.resolveAccessToken(whatsappNumber);

    let result;
    try {
      result = await this.metaService.sendTextMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        text,
      );
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw new BadGatewayException(`WhatsApp send failed: ${error.message}`);
      }
      throw error;
    }

    const message = await this.messagesService.create({
      tenantId,
      conversationId,
      direction: 'outbound',
      senderType: actor.type,
      senderId: actor.id,
      waMessageId: result.messages[0]?.id,
      type: 'text',
      content: { body: text },
      status: 'sent',
    });

    await this.conversationsService.markFirstResponseIfUnset(conversation);
    this.eventsGateway.emitToConversation(conversationId, 'message:new', message);
    return message;
  }

  /** Processed by the whatsapp-inbound queue worker — see src/queue. */
  async handleInboundEvent(body: MetaWebhookBody): Promise<void> {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        if (change.field === 'message_template_status_update') {
          const newStatus = value.event ? META_TEMPLATE_EVENT_TO_STATUS[value.event] : undefined;
          if (value.message_template_id && newStatus) {
            await this.templatesService.applyStatusUpdateFromWebhook(value.message_template_id, newStatus);
          }
          continue;
        }

        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        let whatsappNumber;
        try {
          whatsappNumber = await this.whatsappNumbersService.findByPhoneNumberId(phoneNumberId);
        } catch {
          this.logger.warn(`Ignoring webhook for unregistered phone_number_id=${phoneNumberId}`);
          continue;
        }
        const tenantId = whatsappNumber.tenantId;

        for (const message of value.messages ?? []) {
          const contact = value.contacts?.find((c) => c.wa_id === message.from);
          const customer = await this.customersService.findOrCreateByWhatsappNumber(
            tenantId,
            message.from,
            contact?.profile?.name,
          );
          let conversation = await this.conversationsService.findOrCreateOpen(
            tenantId,
            customer.id,
            whatsappNumber.id,
          );
          const isBrandNew = conversation.status === 'new';
          await this.conversationsService.markCustomerMessageReceived(conversation.id);
          // Reload with relations (customer, ...) — findOrCreateOpen doesn't
          // eager-load them, but the chatbot engine and routing need them.
          conversation = await this.conversationsService.findOne(tenantId, conversation.id);

          const inboundMessage = await this.messagesService.create({
            tenantId,
            conversationId: conversation.id,
            direction: 'inbound',
            senderType: 'customer',
            waMessageId: message.id,
            type: (message.type as Message['type']) ?? 'text',
            content: this.extractContent(message),
            status: 'sent',
            sentAt: new Date(Number(message.timestamp) * 1000),
          });
          this.eventsGateway.emitToConversation(conversation.id, 'message:new', inboundMessage);
          // Cheap broadcast so any open Inbox list re-fetches rather than
          // trying to diff exactly which conversations changed — the list
          // query itself is the source of truth.
          this.eventsGateway.emitToTenant(tenantId, 'conversation:updated', { conversationId: conversation.id });

          if (MEDIA_MESSAGE_TYPES.includes(message.type as MediaMessageType)) {
            const media = message[message.type as MediaMessageType] as
              | { id: string; caption?: string }
              | undefined;
            if (media?.id) {
              const accessToken = this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
              await this.attachmentsService.downloadAndStore(
                tenantId,
                inboundMessage.id,
                media.id,
                accessToken,
                media.caption,
              );
            }
          }

          // A real button/list tap arrives as type "interactive", not
          // "text" — the reply's `id` (not `title`) is what the chatbot's
          // condition-matching expects, since that's what
          // ChatbotFlowsService already uses as the option identifier.
          const messageText = this.extractReplyValue(message);
          const isOptOut = Boolean(messageText) && this.consentsService.matchesOptOutKeyword(messageText);

          if (isOptOut) {
            await this.consentsService.record(customer.id, 'opted_out', 'transactional', 'webhook_optin');
            await this.sendOptOutConfirmation(conversation, whatsappNumber);
            // No further automated engagement (bot/AI/routing) — conversation
            // stays as-is for a human to review if needed.
          } else if (conversation.status === 'bot') {
            await this.chatbotService.handleMessage(conversation, { text: messageText });
          } else if (conversation.status === 'ai') {
            await this.aiService.handleMessage(conversation, messageText);
          } else if (isBrandNew) {
            const flow = whatsappNumber.chatbotFlowId
              ? await this.chatbotFlowsService.findPublishedById(tenantId, whatsappNumber.chatbotFlowId)
              : null;
            let handled = false;
            if (flow) {
              await this.chatbotService.startFlow(conversation, flow);
              handled = true;
            } else if (whatsappNumber.aiAgentId) {
              handled = await this.aiService.maybeStartSession(conversation, whatsappNumber.aiAgentId, messageText);
            }
            if (!handled) {
              await this.assignmentService.routeToDepartment(
                conversation,
                whatsappNumber.departmentId ?? null,
              );
            }
          }
          // Any other status (waiting/assigned/in_progress/...) — a human
          // already owns this conversation; it just shows up in their Inbox.

          try {
            const accessToken = this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
            await this.metaService.markAsRead(phoneNumberId, accessToken, message.id);
          } catch (error) {
            this.logger.warn(`markAsRead failed (non-fatal): ${(error as Error).message}`);
          }
        }

        for (const status of value.statuses ?? []) {
          const internalStatus = META_TO_INTERNAL_STATUS[status.status];
          if (!internalStatus) continue;
          await this.messagesService.recordStatusUpdate(
            status.id,
            internalStatus,
            new Date(Number(status.timestamp) * 1000),
            status as unknown as Record<string, unknown>,
          );
        }
      }
    }
  }

  /** The effective "typed reply" for chatbot condition-matching: free text as typed, or a button/list reply's `id` (matches the option ids ChatbotFlowsService already assigns). */
  private extractReplyValue(message: {
    type: string;
    text?: { body: string };
    interactive?: {
      type: 'button_reply' | 'list_reply';
      button_reply?: { id: string; title: string };
      list_reply?: { id: string; title: string; description?: string };
    };
  }): string {
    if (message.type === 'text') return message.text?.body ?? '';
    if (message.type === 'interactive') {
      return message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id ?? '';
    }
    return '';
  }

  private extractContent(message: { type: string; text?: { body: string }; [key: string]: unknown }) {
    if (message.type === 'text' && message.text) {
      return { body: message.text.body };
    }
    // Non-text types (image/document/audio/video/location/interactive/...):
    // stored as-is for now. Media download to object storage is added
    // alongside the Uploads module in a later phase.
    return message as Record<string, unknown>;
  }

  /** A one-time transactional courtesy reply confirming the opt-out itself — sent directly via MetaService, bypassing the compliance gate that this exact record() call would otherwise now trigger. */
  private async sendOptOutConfirmation(
    conversation: Conversation,
    whatsappNumber: Awaited<ReturnType<WhatsappNumbersService['findByPhoneNumberId']>>,
  ): Promise<void> {
    const text =
      conversation.customer.language === 'en'
        ? "You've been unsubscribed and won't receive further messages. Reply anytime to opt back in."
        : 'تم إلغاء اشتراكك ولن تصلك رسائل أخرى. يمكنك إعادة التواصل معنا في أي وقت.';
    try {
      const accessToken = this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
      const result = await this.metaService.sendTextMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        text,
      );
      await this.messagesService.create({
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        direction: 'outbound',
        senderType: 'system',
        waMessageId: result.messages[0]?.id,
        type: 'text',
        content: { body: text },
        status: 'sent',
      });
    } catch (error) {
      if (error instanceof MetaApiError) {
        this.logger.warn(`Opt-out confirmation send failed (non-fatal): ${error.message}`);
        return;
      }
      throw error;
    }
  }
}

export { MetaApiError };
