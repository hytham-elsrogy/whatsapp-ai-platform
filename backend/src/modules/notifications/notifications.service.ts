import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsGateway } from '@/modules/realtime/events.gateway';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationInput {
  tenantId: string;
  userId: string;
  type: NotificationType;
  payload?: Record<string, unknown>;
}

/**
 * Persists notifications only — no Socket.IO push yet (that's the
 * Notifications+Socket.IO phase; for now the frontend polls). Every
 * SLA-breach / assignment notifier in this codebase should go through
 * `create()` rather than writing to the table directly.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = await this.repo.save(this.repo.create({ ...input, payload: input.payload ?? {} }));
    this.eventsGateway.emitToUser(input.userId, 'notification:new', notification);
    return notification;
  }

  findForUser(tenantId: string, userId: string, unreadOnly = false): Promise<Notification[]> {
    return this.repo.find({
      where: unreadOnly ? { tenantId, userId, isRead: false } : { tenantId, userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<void> {
    await this.repo.update({ id, tenantId, userId }, { isRead: true });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.repo.update({ tenantId, userId, isRead: false }, { isRead: true });
  }
}
