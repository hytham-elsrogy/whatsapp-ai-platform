import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { SlaPolicy } from "./entities/sla-policy.entity";
import { SlaBreach, SlaBreachType } from "./entities/sla-breach.entity";
import { CreateSlaPolicyDto } from "./dto/create-sla-policy.dto";

@Injectable()
export class SlaService {
  constructor(
    @InjectRepository(SlaPolicy)
    private readonly policyRepo: Repository<SlaPolicy>,
    @InjectRepository(SlaBreach)
    private readonly breachRepo: Repository<SlaBreach>,
    private readonly notificationsService: NotificationsService,
  ) {}

  findAll(tenantId: string): Promise<SlaPolicy[]> {
    return this.policyRepo.find({ where: { tenantId } });
  }

  async findOne(tenantId: string, id: string): Promise<SlaPolicy> {
    const policy = await this.policyRepo.findOne({ where: { id, tenantId } });
    if (!policy) throw new NotFoundException("SLA policy not found");
    return policy;
  }

  create(tenantId: string, dto: CreateSlaPolicyDto): Promise<SlaPolicy> {
    return this.policyRepo.save(this.policyRepo.create({ ...dto, tenantId }));
  }

  /**
   * Most specific match wins: department+category > department-only >
   * category-only > tenant-wide default (both null). Returns null if no
   * policy applies — callers must treat that as "no SLA tracked", not an error.
   */
  async findMatchingPolicy(
    tenantId: string,
    departmentId: string | null,
    category: string | null,
  ): Promise<SlaPolicy | null> {
    const candidates = await this.policyRepo.find({ where: { tenantId } });
    const score = (p: SlaPolicy): number => {
      const deptMatch = departmentId && p.departmentId === departmentId;
      const catMatch = category && p.category === category;
      if (deptMatch && catMatch) return 4;
      if (deptMatch && !p.category) return 3;
      if (!p.departmentId && catMatch) return 2;
      if (!p.departmentId && !p.category) return 1;
      return 0;
    };
    const ranked = candidates
      .map((p) => ({ p, s: score(p) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
    return ranked[0]?.p ?? null;
  }

  computeDueAt(fromDate: Date, minutes: number): Date {
    return new Date(fromDate.getTime() + minutes * 60_000);
  }

  async hasBreach(
    scope: { ticketId?: string; conversationId?: string },
    type: SlaBreachType,
  ): Promise<boolean> {
    const count = await this.breachRepo.count({
      where: {
        type,
        ticketId: scope.ticketId ?? IsNull(),
        conversationId: scope.conversationId ?? IsNull(),
      },
    });
    return count > 0;
  }

  async recordBreach(
    tenantId: string,
    supervisorUserIds: string[],
    policyId: string,
    scope: { ticketId?: string | null; conversationId?: string | null },
    type: SlaBreachType,
  ): Promise<void> {
    await this.breachRepo.save(
      this.breachRepo.create({
        policyId,
        ticketId: scope.ticketId ?? null,
        conversationId: scope.conversationId ?? null,
        type,
      }),
    );
    for (const userId of supervisorUserIds) {
      await this.notificationsService.create({
        tenantId,
        userId,
        type: "sla_breach",
        payload: { ...scope, breachType: type },
      });
    }
  }
}
