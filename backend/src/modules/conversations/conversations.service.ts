import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, In, IsNull, Repository } from "typeorm";
import { AuditLogsService } from "@/modules/audit-logs/audit-logs.service";
import {
  CLOSED_STATUSES,
  Conversation,
  ConversationStatus,
} from "./entities/conversation.entity";

const SERVICE_WINDOW_HOURS = 24;

// See docs/architecture/08-routing-architecture.md § 4 Conversation State Machine.
const ALLOWED_TRANSITIONS: Record<ConversationStatus, ConversationStatus[]> = {
  new: ["waiting", "bot", "ai", "assigned"],
  bot: ["ai", "waiting"],
  ai: ["assigned", "resolved", "waiting"],
  waiting: ["assigned"],
  assigned: ["in_progress", "escalated"],
  in_progress: ["pending_customer", "escalated", "resolved"],
  pending_customer: ["in_progress"],
  escalated: ["in_progress", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export type ConversationFilter =
  "all" | "unassigned" | "mine" | "waiting" | "resolved";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly repo: Repository<Conversation>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(
    tenantId: string,
    filter: ConversationFilter = "all",
    currentUserId?: string,
  ): Promise<Conversation[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filter === "unassigned") where.assignedAgentId = IsNull();
    if (filter === "mine" && currentUserId)
      where.assignedAgentId = currentUserId;
    if (filter === "waiting") where.status = "waiting";
    if (filter === "resolved") where.status = In(CLOSED_STATUSES);

    return this.repo.find({
      where,
      relations: ["customer", "assignedAgent", "department"],
      order: { updatedAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Conversation> {
    const conversation = await this.repo.findOne({
      where: { id, tenantId },
      relations: ["customer", "assignedAgent", "department"],
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }

  async findOrCreateOpen(
    tenantId: string,
    customerId: string,
    whatsappNumberId: string,
  ): Promise<Conversation> {
    const existing = await this.repo.findOne({
      where: { tenantId, customerId, status: Not(In(CLOSED_STATUSES)) },
      order: { createdAt: "DESC" },
    });
    if (existing) return existing;

    const conversation = this.repo.create({
      tenantId,
      customerId,
      whatsappNumberId,
      status: "new",
    });
    return this.repo.save(conversation);
  }

  async markCustomerMessageReceived(conversationId: string): Promise<void> {
    await this.repo.update(conversationId, {
      lastCustomerMessageAt: new Date(),
    });
  }

  async markFirstResponseIfUnset(conversation: Conversation): Promise<void> {
    if (!conversation.firstResponseAt) {
      await this.repo.update(conversation.id, { firstResponseAt: new Date() });
    }
    if (conversation.status === "assigned") {
      await this.transition(conversation, "in_progress", { type: "system" });
    }
  }

  isWithinServiceWindow(conversation: Conversation): boolean {
    if (!conversation.lastCustomerMessageAt) return false;
    const elapsedMs =
      Date.now() - new Date(conversation.lastCustomerMessageAt).getTime();
    return elapsedMs <= SERVICE_WINDOW_HOURS * 60 * 60 * 1000;
  }

  countActiveForAgent(agentId: string): Promise<number> {
    return this.repo.count({
      where: { assignedAgentId: agentId, status: Not(In(CLOSED_STATUSES)) },
    });
  }

  async setDepartment(
    conversationId: string,
    departmentId: string,
  ): Promise<void> {
    await this.repo.update(conversationId, { departmentId });
  }

  async setAssignedAgent(
    conversationId: string,
    agentId: string,
  ): Promise<void> {
    await this.repo.update(conversationId, { assignedAgentId: agentId });
  }

  async setPriority(
    conversationId: string,
    priority: Conversation["priority"],
  ): Promise<void> {
    await this.repo.update(conversationId, { priority });
  }

  async setAiAgent(
    conversationId: string,
    aiAgentId: string | null,
  ): Promise<void> {
    await this.repo.update(conversationId, { aiAgentId });
  }

  /**
   * Validates and applies a status change per the documented state machine,
   * and always writes an audit_logs entry — no other code path may write
   * `conversations.status` directly.
   */
  async transition(
    conversation: Conversation,
    newStatus: ConversationStatus,
    actor: { type: string; id?: string },
  ): Promise<Conversation> {
    const allowed = ALLOWED_TRANSITIONS[conversation.status] ?? [];
    if (conversation.status !== newStatus && !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition conversation from "${conversation.status}" to "${newStatus}"`,
      );
    }

    const oldStatus = conversation.status;
    const patch: Partial<Conversation> = { status: newStatus };
    if (newStatus === "resolved") patch.resolvedAt = new Date();
    if (newStatus === "closed") patch.closedAt = new Date();

    await this.repo.update(conversation.id, patch);

    await this.auditLogsService.record({
      tenantId: conversation.tenantId,
      userId: actor.id,
      action: "conversation.status_changed",
      entityType: "conversation",
      entityId: conversation.id,
      oldValue: { status: oldStatus },
      newValue: { status: newStatus, actorType: actor.type },
    });

    return { ...conversation, ...patch };
  }
}
