import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { DepartmentsService } from "@/modules/departments/departments.service";
import { RoutingService } from "@/modules/routing/routing.service";
import { AuditLogsService } from "@/modules/audit-logs/audit-logs.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { EventsGateway } from "@/modules/realtime/events.gateway";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly departmentsService: DepartmentsService,
    private readonly routingService: RoutingService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Called right after a new conversation is created for an inbound message,
   * by the chatbot engine when a flow hands a conversation off to a
   * department, and by the AI Agent when it escalates/hands over. Valid from
   * "new", "bot" or "ai" status (all transition to "waiting" per the
   * conversation state machine).
   */
  async routeToDepartment(
    conversation: Conversation,
    departmentId: string | null,
  ): Promise<void> {
    if (!["new", "bot", "ai"].includes(conversation.status)) return;

    if (!departmentId) {
      // No department configured — stays as-is for a supervisor to triage
      // manually via the Inbox.
      return;
    }

    await this.conversationsService.setDepartment(
      conversation.id,
      departmentId,
    );
    const waiting = await this.conversationsService.transition(
      conversation,
      "waiting",
      {
        type: "system",
      },
    );

    const agentId = await this.routingService.selectAgent(
      departmentId,
      conversation.id,
    );
    if (agentId) {
      await this.assign(waiting.tenantId, waiting.id, agentId, {
        type: "system",
      });
    }
  }

  async assign(
    tenantId: string,
    conversationId: string,
    agentId: string,
    actor: { type: string; id?: string },
  ): Promise<Conversation> {
    const conversation = await this.conversationsService.findOne(
      tenantId,
      conversationId,
    );

    if (conversation.departmentId) {
      const agents = await this.departmentsService.getDepartmentAgents(
        conversation.departmentId,
      );
      if (!agents.some((a) => a.userId === agentId)) {
        throw new BadRequestException(
          "Agent is not a member of this conversation's department",
        );
      }
    }

    await this.conversationsService.setAssignedAgent(conversationId, agentId);
    if (["new", "waiting", "ai"].includes(conversation.status)) {
      await this.conversationsService.transition(
        { ...conversation, assignedAgentId: agentId },
        "assigned",
        actor,
      );
    }

    await this.auditLogsService.record({
      tenantId,
      userId: actor.id,
      action: "conversation.assigned",
      entityType: "conversation",
      entityId: conversationId,
      newValue: { assignedAgentId: agentId },
    });

    // See docs/architecture/08-routing-architecture.md § 3 — a documented
    // gap since Phase 4, where AssignmentService.assign() never actually
    // notified the agent it assigned to.
    await this.notificationsService.create({
      tenantId,
      userId: agentId,
      type: "new_assignment",
      payload: { conversationId },
    });
    this.eventsGateway.emitToTenant(tenantId, "conversation:updated", {
      conversationId,
    });

    // Refetch rather than patching the pre-assignment `conversation` object
    // in place — it still carries the `assignedAgent` relation loaded
    // *before* this reassignment, which would otherwise mismatch the
    // now-correct `assignedAgentId` scalar in the same response.
    return this.conversationsService.findOne(tenantId, conversationId);
  }

  async transfer(
    tenantId: string,
    conversationId: string,
    toDepartmentId: string,
    actor: { type: string; id?: string },
  ): Promise<Conversation> {
    const conversation = await this.conversationsService.findOne(
      tenantId,
      conversationId,
    );
    await this.conversationsService.setDepartment(
      conversationId,
      toDepartmentId,
    );

    await this.auditLogsService.record({
      tenantId,
      userId: actor.id,
      action: "conversation.transferred",
      entityType: "conversation",
      entityId: conversationId,
      oldValue: { departmentId: conversation.departmentId },
      newValue: { departmentId: toDepartmentId },
    });

    const agentId = await this.routingService.selectAgent(
      toDepartmentId,
      conversationId,
    );
    if (agentId) {
      return this.assign(tenantId, conversationId, agentId, actor);
    }
    return this.conversationsService.findOne(tenantId, conversationId);
  }
}
