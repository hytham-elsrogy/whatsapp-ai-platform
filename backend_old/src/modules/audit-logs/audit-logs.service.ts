import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from '../../common/enums';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    userId?: string;
    action: AuditAction;
    resource?: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const log = this.auditLogRepo.create(params);
    await this.auditLogRepo.save(log).catch(() => {});
  }

  async findAll(query: {
    page?: number; limit?: number;
    userId?: string; action?: AuditAction;
    from?: Date; to?: Date;
  }) {
    const { page = 1, limit = 50, userId, action, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (from && to) qb.andWhere('log.createdAt BETWEEN :from AND :to', { from, to });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
