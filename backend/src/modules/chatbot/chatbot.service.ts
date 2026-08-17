import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { IsNull, Repository } from "typeorm";
import { Queue } from "bullmq";
import { MetaApiError, MetaService } from "@/modules/meta/meta.service";
import { WhatsappNumbersService } from "@/modules/whatsapp-numbers/whatsapp-numbers.service";
import { MessagesService } from "@/modules/messages/messages.service";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { AssignmentService } from "@/modules/assignment/assignment.service";
import { AiService } from "@/modules/ai-agents/ai.service";
import { TagsService } from "@/modules/tags/tags.service";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { ChatbotFlow } from "./entities/chatbot-flow.entity";
import { ChatbotNode } from "./entities/chatbot-node.entity";
import { ChatbotEdge } from "./entities/chatbot-edge.entity";
import { ChatbotSession } from "./entities/chatbot-session.entity";
import {
  CHATBOT_DELAY_QUEUE,
  MAX_DELAY_SECONDS,
} from "./chatbot-delay.constants";

export interface InboundReply {
  text: string;
}

const MAX_STEPS_PER_TURN = 25; // guards against a misconfigured flow looping forever

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @InjectRepository(ChatbotSession)
    private readonly sessionRepo: Repository<ChatbotSession>,
    @InjectRepository(ChatbotNode)
    private readonly nodeRepo: Repository<ChatbotNode>,
    @InjectRepository(ChatbotEdge)
    private readonly edgeRepo: Repository<ChatbotEdge>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectQueue(CHATBOT_DELAY_QUEUE)
    private readonly delayQueue: Queue,
    private readonly metaService: MetaService,
    private readonly whatsappNumbersService: WhatsappNumbersService,
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
    private readonly assignmentService: AssignmentService,
    private readonly aiService: AiService,
    private readonly tagsService: TagsService,
  ) {}

  async findActiveSession(
    conversationId: string,
  ): Promise<ChatbotSession | null> {
    return this.sessionRepo.findOne({
      where: { conversationId, endedAt: IsNull() },
      order: { startedAt: "DESC" },
    });
  }

  async startFlow(
    conversation: Conversation,
    flow: ChatbotFlow,
  ): Promise<void> {
    const startNode = await this.nodeRepo.findOne({
      where: { flowId: flow.id, type: "start" },
    });
    if (!startNode) {
      this.logger.warn(`Flow ${flow.id} has no start node — skipping`);
      return;
    }

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        conversationId: conversation.id,
        flowId: flow.id,
        variables: {},
      }),
    );
    await this.conversationsService.transition(conversation, "bot", {
      type: "bot",
    });

    await this.runFrom(session, startNode.id, conversation);
  }

  async handleMessage(
    conversation: Conversation,
    reply: InboundReply,
  ): Promise<void> {
    const session = await this.findActiveSession(conversation.id);
    if (!session || !session.currentNodeId) return;

    const currentNode = await this.nodeRepo.findOne({
      where: { id: session.currentNodeId },
    });
    if (!currentNode) return;

    if (currentNode.type === "delay") {
      // A delay node is waiting on a timer, not a customer reply — a message
      // arriving mid-wait shouldn't skip the delay early. The scheduled
      // BullMQ job (see resumeAfterDelay) is what advances the flow.
      return;
    }

    const variableName =
      (currentNode.config?.variable as string) ?? currentNode.id;
    session.variables = {
      ...session.variables,
      [variableName]: reply.text.trim(),
    };
    await this.sessionRepo.save(session);

    await this.advance(
      session,
      currentNode.id,
      conversation,
      reply.text.trim(),
    );
  }

  /**
   * Resumes a flow after a `delay` node's scheduled wait elapses. Guards
   * against stale jobs: the session may have ended, or moved past this node
   * through some other path, since the job was scheduled.
   */
  async resumeAfterDelay(sessionId: string, nodeId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.endedAt || session.currentNodeId !== nodeId) {
      this.logger.debug(
        `Skipping stale delay resume for session ${sessionId}, node ${nodeId}`,
      );
      return;
    }

    const conversation = await this.conversationRepo.findOne({
      where: { id: session.conversationId },
      relations: ["customer", "assignedAgent", "department"],
    });
    if (!conversation || conversation.status !== "bot") {
      // Conversation was closed, reassigned, or handed off to a human/AI
      // while the delay was pending — resuming the bot now would be wrong.
      this.logger.debug(
        `Skipping delay resume: conversation ${session.conversationId} is no longer bot-owned`,
      );
      return;
    }

    await this.advance(session, nodeId, conversation, undefined);
  }

  /** Runs a node's side effect, then keeps advancing through non-interactive nodes. */
  private async runFrom(
    session: ChatbotSession,
    nodeId: string,
    conversation: Conversation,
    steps = 0,
  ): Promise<void> {
    if (steps >= MAX_STEPS_PER_TURN) {
      this.logger.error(
        `Flow ${session.flowId} exceeded max steps per turn — aborting to avoid a loop`,
      );
      await this.endSession(session);
      return;
    }

    const node = await this.nodeRepo.findOne({ where: { id: nodeId } });
    if (!node) {
      await this.endSession(session);
      return;
    }

    switch (node.type) {
      case "start": {
        await this.advance(session, node.id, conversation, undefined, steps);
        return;
      }
      case "message": {
        await this.sendBotText(conversation, String(node.config?.text ?? ""));
        await this.advance(session, node.id, conversation, undefined, steps);
        return;
      }
      case "question": {
        const prompt = String(node.config?.text ?? "");
        if (prompt) await this.sendBotText(conversation, prompt);
        await this.waitForReply(session, node.id);
        return;
      }
      case "button":
      case "list": {
        await this.sendBotInteractive(conversation, node);
        await this.waitForReply(session, node.id);
        return;
      }
      case "condition": {
        await this.advance(
          session,
          node.id,
          conversation,
          this.resolveConditionValue(node, session),
          steps,
        );
        return;
      }
      case "department": {
        const departmentId = node.config?.departmentId as string | undefined;
        await this.endSession(session);
        if (departmentId) {
          await this.assignmentService.routeToDepartment(
            conversation,
            departmentId,
          );
        }
        return;
      }
      case "agent": {
        const departmentId =
          (node.config?.departmentId as string | undefined) ??
          conversation.departmentId;
        await this.endSession(session);
        if (departmentId) {
          await this.assignmentService.routeToDepartment(
            conversation,
            departmentId,
          );
        } else {
          await this.conversationsService.transition(conversation, "waiting", {
            type: "bot",
          });
        }
        return;
      }
      case "ai": {
        const aiAgentId = conversation.department?.aiAgentId;
        await this.endSession(session);
        const started = aiAgentId
          ? await this.aiService.maybeStartSession(conversation, aiAgentId)
          : false;
        if (!started) {
          this.logger.warn(
            `Node ${node.id} is type "ai" but no active AI agent is configured for this department — handing off to human`,
          );
          await this.conversationsService.transition(conversation, "waiting", {
            type: "bot",
          });
        }
        return;
      }
      case "api_call":
      case "db_query": {
        // Integration layer isn't built yet.
        this.logger.warn(
          `Node ${node.id} is type "${node.type}" — not implemented, skipping`,
        );
        await this.advance(session, node.id, conversation, undefined, steps);
        return;
      }
      case "tag": {
        const tagName = node.config?.tagName as string | undefined;
        if (tagName) {
          const tag = await this.tagsService.findOrCreateByName(
            conversation.tenantId,
            tagName,
            "conversation",
          );
          await this.tagsService.attachToConversation(
            conversation.tenantId,
            conversation.id,
            tag.id,
          );
        } else {
          this.logger.warn(
            `Node ${node.id} is type "tag" but has no config.tagName — skipping`,
          );
        }
        await this.advance(session, node.id, conversation, undefined, steps);
        return;
      }
      case "delay": {
        const seconds = Math.min(
          Number(node.config?.seconds ?? 0),
          MAX_DELAY_SECONDS,
        );
        if (seconds <= 0) {
          await this.advance(session, node.id, conversation, undefined, steps);
          return;
        }
        session.currentNodeId = node.id;
        await this.sessionRepo.save(session);
        await this.delayQueue.add(
          "resume",
          { sessionId: session.id, nodeId: node.id },
          {
            delay: seconds * 1000,
            jobId: `chatbot-delay:${session.id}:${node.id}`,
          },
        );
        return;
      }
      case "end":
      default: {
        await this.endSession(session);
        return;
      }
    }
  }

  private async advance(
    session: ChatbotSession,
    fromNodeId: string,
    conversation: Conversation,
    replyValue: string | undefined,
    steps = 0,
  ): Promise<void> {
    const edges = await this.edgeRepo.find({
      where: { sourceNodeId: fromNodeId },
    });
    if (edges.length === 0) {
      await this.endSession(session);
      return;
    }

    const matched =
      edges.find((e) => this.edgeMatches(e, replyValue)) ??
      edges.find((e) => !e.condition) ??
      edges[0];

    await this.runFrom(session, matched.targetNodeId, conversation, steps + 1);
  }

  private edgeMatches(
    edge: ChatbotEdge,
    replyValue: string | undefined,
  ): boolean {
    if (!edge.condition || replyValue === undefined) return false;
    const expected = edge.condition.equals;
    return expected !== undefined && String(expected) === replyValue;
  }

  private resolveConditionValue(
    node: ChatbotNode,
    session: ChatbotSession,
  ): string | undefined {
    const variable = node.config?.variable as string | undefined;
    if (!variable) return undefined;
    const value = session.variables[variable];
    return value === undefined ? undefined : String(value);
  }

  private getOptions(node: ChatbotNode): Array<{ id: string; title: string }> {
    return (
      (node.config?.buttons as
        Array<{ id: string; title: string }> | undefined) ??
      (node.config?.items as
        Array<{ id: string; title: string }> | undefined) ??
      []
    );
  }

  private renderChoices(node: ChatbotNode): string {
    const text = String(node.config?.text ?? "");
    const lines = this.getOptions(node).map((o) => `${o.id} - ${o.title}`);
    return [text, ...lines].filter(Boolean).join("\n");
  }

  private async waitForReply(
    session: ChatbotSession,
    nodeId: string,
  ): Promise<void> {
    session.currentNodeId = nodeId;
    await this.sessionRepo.save(session);
  }

  private async endSession(session: ChatbotSession): Promise<void> {
    await this.sessionRepo.update(session.id, {
      endedAt: new Date(),
      currentNodeId: null,
    });
  }

  private async sendBotText(
    conversation: Conversation,
    text: string,
  ): Promise<void> {
    if (!text) return;
    const whatsappNumber = await this.whatsappNumbersService.findById(
      conversation.whatsappNumberId,
    );
    const accessToken =
      this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
    try {
      const result = await this.metaService.sendTextMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        text,
      );
      await this.messagesService.create({
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        direction: "outbound",
        senderType: "bot",
        waMessageId: result.messages[0]?.id,
        type: "text",
        content: { body: text },
        status: "sent",
      });
    } catch (error) {
      if (error instanceof MetaApiError) {
        this.logger.warn(
          `Bot message send failed (non-fatal): ${error.message}`,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Sends a real WhatsApp interactive button/list message for `button`/`list`
   * nodes instead of a numbered-text approximation. Falls back to the old
   * numbered-text rendering only for a *config* problem (e.g. a button node
   * with more than Meta's 3-option limit) — a real Meta API failure is
   * handled the same non-fatal way as sendBotText, not papered over with a
   * fallback that would silently change the flow's behavior.
   */
  private async sendBotInteractive(
    conversation: Conversation,
    node: ChatbotNode,
  ): Promise<void> {
    const text = String(node.config?.text ?? "");
    const options = this.getOptions(node);
    if (options.length === 0) {
      await this.sendBotText(conversation, text);
      return;
    }

    const whatsappNumber = await this.whatsappNumbersService.findById(
      conversation.whatsappNumberId,
    );
    const accessToken =
      this.whatsappNumbersService.resolveAccessToken(whatsappNumber);

    let result;
    try {
      const interactive =
        node.type === "button"
          ? { type: "button" as const, bodyText: text, buttons: options }
          : {
              type: "list" as const,
              bodyText: text,
              buttonText: "اختر",
              rows: options,
            };
      result = await this.metaService.sendInteractiveMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        interactive,
      );
    } catch (error) {
      if (error instanceof MetaApiError) {
        this.logger.warn(
          `Interactive message send failed (non-fatal): ${error.message}`,
        );
        return;
      }
      // Not a Meta API failure — a config problem (e.g. too many options).
      // Fall back to the numbered-text rendering so the flow still works.
      this.logger.warn(
        `Interactive message config invalid, falling back to text: ${(error as Error).message}`,
      );
      await this.sendBotText(conversation, this.renderChoices(node));
      return;
    }

    await this.messagesService.create({
      tenantId: conversation.tenantId,
      conversationId: conversation.id,
      direction: "outbound",
      senderType: "bot",
      waMessageId: result.messages[0]?.id,
      type: "interactive",
      content: { body: text, options },
      status: "sent",
    });
  }
}
