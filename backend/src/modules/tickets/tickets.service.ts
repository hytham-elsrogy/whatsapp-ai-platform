import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogsService } from "@/modules/audit-logs/audit-logs.service";
import { SlaService } from "@/modules/sla/sla.service";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { CustomersService } from "@/modules/customers/customers.service";
import { DepartmentsService } from "@/modules/departments/departments.service";
import { UsersService } from "@/modules/users/users.service";
import { Ticket, TicketStatus } from "./entities/ticket.entity";
import { TicketComment } from "./entities/ticket-comment.entity";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { CreateTicketCommentDto } from "./dto/create-comment.dto";

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["pending", "resolved"],
  pending: ["open", "resolved"],
  resolved: ["closed", "open"],
  closed: [],
};

export interface TicketWithComments extends Ticket {
  comments: TicketComment[];
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
    private readonly slaService: SlaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly conversationsService: ConversationsService,
    private readonly customersService: CustomersService,
    private readonly departmentsService: DepartmentsService,
    private readonly usersService: UsersService,
  ) {}

  findAll(tenantId: string): Promise<Ticket[]> {
    return this.ticketRepo.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TicketWithComments> {
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId } });
    if (!ticket) throw new NotFoundException("Ticket not found");
    const comments = await this.commentRepo.find({
      where: { ticketId: id },
      order: { createdAt: "ASC" },
    });
    return { ...ticket, comments };
  }

  async create(
    tenantId: string,
    userId: string | null,
    dto: CreateTicketDto,
  ): Promise<Ticket> {
    // Every foreign id here comes straight from client input — verify each
    // one actually belongs to this tenant before writing it onto the
    // ticket, otherwise the row ends up with a dangling reference into
    // another tenant's data.
    await this.customersService.findOne(tenantId, dto.customerId);
    if (dto.conversationId) {
      await this.conversationsService.findOne(tenantId, dto.conversationId);
    }
    if (dto.departmentId) {
      await this.departmentsService.findOne(tenantId, dto.departmentId);
    }
    if (dto.agentId) {
      await this.usersService.findOne(tenantId, dto.agentId);
    }

    const policy = await this.slaService.findMatchingPolicy(
      tenantId,
      dto.departmentId ?? null,
      dto.category ?? null,
    );
    const now = new Date();

    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        tenantId,
        ticketNumber: await this.generateTicketNumber(tenantId),
        customerId: dto.customerId,
        conversationId: dto.conversationId ?? null,
        departmentId: dto.departmentId ?? null,
        agentId: dto.agentId ?? null,
        priority: dto.priority ?? "normal",
        category: dto.category ?? null,
        status: "open",
        slaPolicyId: policy?.id ?? null,
        dueAt: policy
          ? this.slaService.computeDueAt(now, policy.resolutionMinutes)
          : null,
      }),
    );

    await this.commentRepo.save(
      this.commentRepo.create({
        ticketId: ticket.id,
        userId,
        body: dto.description,
        isInternal: false,
      }),
    );

    await this.auditLogsService.record({
      tenantId,
      userId: userId ?? undefined,
      action: "ticket.created",
      entityType: "ticket",
      entityId: ticket.id,
      newValue: {
        ticketNumber: ticket.ticketNumber,
        priority: ticket.priority,
      },
    });

    return ticket;
  }

  async addComment(
    tenantId: string,
    ticketId: string,
    userId: string,
    dto: CreateTicketCommentDto,
  ): Promise<TicketComment> {
    await this.findOne(tenantId, ticketId); // tenant-scope check
    return this.commentRepo.save(
      this.commentRepo.create({
        ticketId,
        userId,
        body: dto.body,
        isInternal: dto.isInternal ?? true,
      }),
    );
  }

  async transition(
    tenantId: string,
    id: string,
    newStatus: TicketStatus,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketRepo.findOne({ where: { id, tenantId } });
    if (!ticket) throw new NotFoundException("Ticket not found");

    const allowed = ALLOWED_TRANSITIONS[ticket.status] ?? [];
    if (ticket.status !== newStatus && !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition ticket from "${ticket.status}" to "${newStatus}"`,
      );
    }

    const patch: Partial<Ticket> = { status: newStatus };
    if (newStatus === "resolved") patch.resolvedAt = new Date();
    if (newStatus === "closed") patch.closedAt = new Date();

    await this.ticketRepo.update(id, patch);

    await this.auditLogsService.record({
      tenantId,
      userId,
      action: "ticket.status_changed",
      entityType: "ticket",
      entityId: id,
      oldValue: { status: ticket.status },
      newValue: { status: newStatus },
    });

    return { ...ticket, ...patch };
  }

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const count = await this.ticketRepo.count({ where: { tenantId } });
    const candidate = `TCK-${String(count + 1).padStart(6, "0")}`;
    const exists = await this.ticketRepo.findOne({
      where: { ticketNumber: candidate },
    });
    // Extremely unlikely race (count-based numbering under concurrent creates) —
    // fall back to a timestamp suffix rather than retrying in a loop.
    return exists ? `${candidate}-${Date.now()}` : candidate;
  }
}
