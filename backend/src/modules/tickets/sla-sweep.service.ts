import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThan, Not, Repository } from "typeorm";
import { SlaService } from "@/modules/sla/sla.service";
import { DepartmentsService } from "@/modules/departments/departments.service";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import {
  CLOSED_STATUSES,
  Conversation,
} from "@/modules/conversations/entities/conversation.entity";
import { Ticket } from "./entities/ticket.entity";

const ESCALATABLE_STATUSES = ["assigned", "in_progress"] as const;

/**
 * Periodic breach sweep (see docs/architecture/08-routing-architecture.md § 5).
 * Tickets track a single `due_at` (resolution); conversations have no due_at
 * column, so this recomputes first-response/resolution deadlines from their
 * matched SLA policy + created_at on every sweep instead.
 */
@Injectable()
export class SlaSweepService {
  private readonly logger = new Logger(SlaSweepService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    private readonly slaService: SlaService,
    private readonly departmentsService: DepartmentsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async run(): Promise<void> {
    await this.sweepTickets();
    await this.sweepConversations();
  }

  private async sweepTickets(): Promise<void> {
    const overdue = await this.ticketRepo.find({
      where: {
        status: In(["open", "pending"]),
        dueAt: LessThan(new Date()),
        slaPolicyId: Not(IsNull()),
      },
    });

    for (const ticket of overdue) {
      if (!ticket.slaPolicyId) continue;
      if (
        await this.slaService.hasBreach({ ticketId: ticket.id }, "resolution")
      )
        continue;

      const supervisorIds = ticket.departmentId
        ? await this.departmentsService.getSupervisorUserIds(
            ticket.departmentId,
          )
        : [];
      await this.slaService.recordBreach(
        ticket.tenantId,
        supervisorIds,
        ticket.slaPolicyId,
        { ticketId: ticket.id },
        "resolution",
      );
      this.logger.warn(`SLA resolution breach: ticket ${ticket.ticketNumber}`);
    }
  }

  private async sweepConversations(): Promise<void> {
    const openConversations = await this.conversationRepo.find({
      where: { status: Not(In(CLOSED_STATUSES)), departmentId: Not(IsNull()) },
    });

    for (const conversation of openConversations) {
      if (!conversation.departmentId) continue;
      const policy = await this.slaService.findMatchingPolicy(
        conversation.tenantId,
        conversation.departmentId,
        null,
      );
      if (!policy) continue;

      const supervisorIds = await this.departmentsService.getSupervisorUserIds(
        conversation.departmentId,
      );

      if (!conversation.firstResponseAt) {
        await this.checkAndBreach(
          conversation,
          policy.id,
          "first_response",
          this.slaService.computeDueAt(
            conversation.createdAt,
            policy.firstResponseMinutes,
          ),
          supervisorIds,
        );
      }
      if (!conversation.resolvedAt) {
        await this.checkAndBreach(
          conversation,
          policy.id,
          "resolution",
          this.slaService.computeDueAt(
            conversation.createdAt,
            policy.resolutionMinutes,
          ),
          supervisorIds,
        );
      }
    }
  }

  private async checkAndBreach(
    conversation: Conversation,
    policyId: string,
    type: "first_response" | "resolution",
    dueAt: Date,
    supervisorIds: string[],
  ): Promise<void> {
    if (dueAt >= new Date()) return;
    if (
      await this.slaService.hasBreach({ conversationId: conversation.id }, type)
    )
      return;

    await this.slaService.recordBreach(
      conversation.tenantId,
      supervisorIds,
      policyId,
      { conversationId: conversation.id },
      type,
    );
    this.logger.warn(`SLA ${type} breach: conversation ${conversation.id}`);

    if (
      (ESCALATABLE_STATUSES as readonly string[]).includes(conversation.status)
    ) {
      await this.conversationsService.transition(conversation, "escalated", {
        type: "system",
      });
    }
  }
}
