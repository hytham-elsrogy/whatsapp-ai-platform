import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MetaApiError, MetaService } from "@/modules/meta/meta.service";
import { WhatsappNumbersService } from "@/modules/whatsapp-numbers/whatsapp-numbers.service";
import { MessagesService } from "@/modules/messages/messages.service";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { EventsGateway } from "@/modules/realtime/events.gateway";
import {
  ComplianceService,
  ComplianceCheckError,
} from "@/modules/compliance/compliance.service";
import { Message } from "@/modules/messages/entities/message.entity";
import { Template, TemplateStatus } from "./entities/template.entity";
import { TemplateVariable } from "./entities/template-variable.entity";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { SendTemplateDto } from "./dto/send-template.dto";

export interface TemplateWithVariables extends Template {
  variables: TemplateVariable[];
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
    @InjectRepository(TemplateVariable)
    private readonly variableRepo: Repository<TemplateVariable>,
    private readonly metaService: MetaService,
    private readonly whatsappNumbersService: WhatsappNumbersService,
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
    private readonly eventsGateway: EventsGateway,
    private readonly complianceService: ComplianceService,
  ) {}

  findAll(tenantId: string): Promise<Template[]> {
    return this.templateRepo.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TemplateWithVariables> {
    const template = await this.templateRepo.findOne({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException("Template not found");
    const variables = await this.variableRepo.find({
      where: { templateId: id },
      order: { position: "ASC" },
    });
    return { ...template, variables };
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateTemplateDto,
  ): Promise<Template> {
    const template = await this.templateRepo.save(
      this.templateRepo.create({
        tenantId,
        name: dto.name,
        category: dto.category,
        language: dto.language,
        body: dto.body,
        status: "pending",
        createdBy: userId,
      }),
    );

    if (dto.variables?.length) {
      await this.variableRepo.save(
        dto.variables.map((v, index) =>
          this.variableRepo.create({
            templateId: template.id,
            position: index + 1,
            exampleValue: v.exampleValue,
            description: v.description,
          }),
        ),
      );
    }

    return template;
  }

  /**
   * Submits the template to Meta for review. This dev environment has no
   * real WABA credentials, so this call is expected to fail with Meta's own
   * auth error — same testing philosophy as the rest of MetaService. Actual
   * approval/rejection then arrives later via the
   * `message_template_status_update` webhook field, handled in
   * `applyStatusUpdateFromWebhook()` below, not from this call's response.
   */
  async submitToMeta(
    tenantId: string,
    id: string,
    whatsappNumberId: string,
  ): Promise<Template> {
    const template = await this.templateRepo.findOne({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException("Template not found");

    const whatsappNumber =
      await this.whatsappNumbersService.findById(whatsappNumberId);
    const accessToken =
      this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
    const variableCount = await this.variableRepo.count({
      where: { templateId: id },
    });

    try {
      const result = await this.metaService.submitTemplate(
        whatsappNumber.wabaId,
        accessToken,
        {
          name: template.name,
          category: template.category,
          language: template.language,
          body: template.body,
          variableCount,
        },
      );
      await this.templateRepo.update(id, { metaTemplateId: result.id });
      return { ...template, metaTemplateId: result.id };
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw new BadGatewayException(
          `Template submission failed: ${error.message}`,
        );
      }
      throw error;
    }
  }

  /** Called by the webhook handler for `message_template_status_update` events. */
  async applyStatusUpdateFromWebhook(
    metaTemplateId: string,
    status: TemplateStatus,
  ): Promise<void> {
    await this.templateRepo.update({ metaTemplateId }, { status });
  }

  /**
   * Manual admin override — Meta's approval webhook can't reach a local dev
   * server, so without this there'd be no way to test the send-template path
   * outside a real deployment. In production this is a fallback for
   * reconciling with Meta's Business Manager, not the primary path.
   */
  async setStatus(
    tenantId: string,
    id: string,
    status: TemplateStatus,
  ): Promise<Template> {
    const template = await this.templateRepo.findOne({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException("Template not found");
    await this.templateRepo.update(id, { status });
    return { ...template, status };
  }

  /**
   * The only place that actually sends a template message + persists it —
   * shared by the human-agent send path (WhatsappController) and the AI
   * Agent's `sendTemplate` action, so both stay in sync without
   * WhatsappModule and AiActionsModule depending on each other.
   */
  async sendApprovedTemplate(
    tenantId: string,
    conversationId: string,
    dto: SendTemplateDto,
    actor: { type: Message["senderType"]; id?: string },
  ): Promise<Message> {
    const conversation = await this.conversationsService.findOne(
      tenantId,
      conversationId,
    );
    const template = await this.templateRepo.findOne({
      where: { tenantId, name: dto.templateName, language: dto.language },
    });
    if (!template || template.status !== "approved") {
      throw new BadRequestException(
        `Template "${dto.templateName}" (${dto.language}) is not an approved template`,
      );
    }

    const whatsappNumber = await this.whatsappNumbersService.findById(
      conversation.whatsappNumberId,
    );

    // Opt-out and rate-limit still apply to templates — duplicate-message
    // detection deliberately doesn't, since sending the same reminder
    // template to many recipients in the same minute is normal, not spam.
    try {
      await this.complianceService.checkOptIn(conversation.customerId);
      await this.complianceService.checkRateLimit(whatsappNumber.phoneNumberId);
    } catch (error) {
      if (error instanceof ComplianceCheckError)
        throw new BadRequestException(error.message);
      throw error;
    }

    const accessToken =
      this.whatsappNumbersService.resolveAccessToken(whatsappNumber);

    let result;
    try {
      result = await this.metaService.sendTemplateMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        template.name,
        template.language,
        dto.variables ?? [],
      );
    } catch (error) {
      if (error instanceof MetaApiError) {
        throw new BadGatewayException(
          `WhatsApp template send failed: ${error.message}`,
        );
      }
      throw error;
    }

    const message = await this.messagesService.create({
      tenantId,
      conversationId,
      direction: "outbound",
      senderType: actor.type,
      senderId: actor.id,
      waMessageId: result.messages[0]?.id,
      type: "template",
      content: {
        name: template.name,
        language: template.language,
        variables: dto.variables ?? [],
      },
      status: "sent",
    });

    await this.conversationsService.markFirstResponseIfUnset(conversation);
    this.eventsGateway.emitToConversation(
      conversationId,
      "message:new",
      message,
    );
    return message;
  }
}
