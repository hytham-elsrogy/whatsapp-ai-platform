import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface RecordAuditLogInput {
  tenantId?: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditLogInput): Promise<void> {
    await this.repo.save(this.repo.create(input));
  }

  findAll(tenantId: string): Promise<AuditLog[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }
}
