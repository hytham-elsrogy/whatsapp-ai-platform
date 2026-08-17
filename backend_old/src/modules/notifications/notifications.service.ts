import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from '../../common/enums';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create(params);
    const saved = await this.notificationRepo.save(notification);
    this.gateway.emitToUser(params.userId, 'notification', saved);
    return saved;
  }

  async notifyNewMessage(conversationId: string, messageId: string, contact: any): Promise<void> {
    this.gateway.emitToAll('new-message', { conversationId, messageId, contact });

    this.gateway.emitToConversation(conversationId, 'message', { conversationId, messageId });
  }

  async notifyConversationAssigned(conversationId: string, assignedToId: string, assignedById: string): Promise<void> {
    await this.create({
      userId: assignedToId,
      type: NotificationType.CONVERSATION_ASSIGNED,
      title: 'تم تعيين محادثة جديدة',
      message: 'تم تعيين محادثة جديدة إليك',
      data: { conversationId },
      actionUrl: `/conversations/${conversationId}`,
    });

    this.gateway.emitToAll('conversation-updated', { conversationId, event: 'assigned' });
  }

  async notifyConversationTransferred(
    conversationId: string, toUserId: string, fromUserId: string, notes?: string,
  ): Promise<void> {
    await this.create({
      userId: toUserId,
      type: NotificationType.CONVERSATION_TRANSFERRED,
      title: 'تم تحويل محادثة إليك',
      message: notes || 'تم تحويل محادثة إليك من موظف آخر',
      data: { conversationId, fromUserId },
      actionUrl: `/conversations/${conversationId}`,
    });

    this.gateway.emitToAll('conversation-updated', { conversationId, event: 'transferred' });
  }

  async notifySLABreach(userId: string, conversationId: string, type: 'first_response' | 'resolution'): Promise<void> {
    await this.create({
      userId,
      type: NotificationType.SLA_BREACH,
      title: 'تجاوز وقت الاستجابة المحدد (SLA)',
      message: type === 'first_response'
        ? 'تجاوزت محادثة حد وقت الاستجابة الأول'
        : 'تجاوزت محادثة حد وقت الحل',
      data: { conversationId, breachType: type },
      actionUrl: `/conversations/${conversationId}`,
    });
  }

  async findAll(userId: string, query: { page?: number; limit?: number; isRead?: boolean }) {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, unread: await this.countUnread(userId) };
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notificationRepo.update(
      { id, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }
}
