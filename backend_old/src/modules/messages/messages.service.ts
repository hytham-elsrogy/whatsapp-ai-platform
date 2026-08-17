import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Message } from './entities/message.entity';
import { Conversation } from '../conversations/entities/conversation.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageDirection, MessageType, MessageStatus, ConversationStatus } from '../../common/enums';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString() conversationId: string;
  @IsEnum(MessageType) @IsOptional() type?: MessageType;
  @IsString() @IsOptional() content?: string;
  @IsString() @IsOptional() mediaUrl?: string;
  @IsString() @IsOptional() caption?: string;
  @IsUUID() @IsOptional() replyToId?: string;
  @IsOptional() metadata?: any;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    private readonly whatsappService: WhatsappService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async send(dto: SendMessageDto, senderId: string): Promise<Message> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: dto.conversationId },
      relations: ['contact'],
    });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');

    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      direction: MessageDirection.OUTBOUND,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      replyToId: dto.replyToId,
      metadata: dto.metadata,
      senderId,
      status: MessageStatus.PENDING,
    });

    const saved = await this.messageRepo.save(message);

    try {
      const waResponse = await this.whatsappService.sendMessage({
        to: conversation.contact.phone,
        type: dto.type || MessageType.TEXT,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        caption: dto.caption,
        replyToId: dto.replyToId,
        metadata: dto.metadata,
      });

      await this.messageRepo.update(saved.id, {
        status: MessageStatus.SENT,
        whatsappMessageId: waResponse?.messages?.[0]?.id,
      });
      saved.status = MessageStatus.SENT;
    } catch (err) {
      await this.messageRepo.update(saved.id, { status: MessageStatus.FAILED });
      saved.status = MessageStatus.FAILED;
    }

    await this.conversationRepo.update(dto.conversationId, {
      lastMessageAt: new Date(),
      lastMessageContent: dto.content || `[${dto.type || 'media'}]`,
      status: ConversationStatus.IN_PROGRESS,
    });

    if (!conversation.firstResponseAt && conversation.status === ConversationStatus.NEW) {
      await this.conversationRepo.update(dto.conversationId, { firstResponseAt: new Date() });
    }

    return saved;
  }

  async getConversationMessages(conversationId: string, query: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data: data.reverse(), total, page, limit };
  }

  async handleIncoming(waMessage: any, contact: any): Promise<Message> {
    const conversation = await this.conversationRepo.findOne({
      where: {
        contactId: contact.id,
        status: Not(In([ConversationStatus.RESOLVED, ConversationStatus.CLOSED])),
      },
      order: { updatedAt: 'DESC' },
    });

    let conversationId: string;
    if (conversation) {
      conversationId = conversation.id;
    } else {
      const newConversation = this.conversationRepo.create({
        contactId: contact.id,
        status: ConversationStatus.NEW,
      });
      const saved = await this.conversationRepo.save(newConversation);
      conversationId = saved.id;
    }

    const message = this.messageRepo.create({
      conversationId,
      direction: MessageDirection.INBOUND,
      type: waMessage.type as MessageType,
      content: waMessage.text?.body || waMessage.caption || null,
      mediaUrl: waMessage.mediaUrl || null,
      whatsappMessageId: waMessage.id,
      status: MessageStatus.DELIVERED,
      latitude: waMessage.location?.latitude,
      longitude: waMessage.location?.longitude,
      locationName: waMessage.location?.name,
      metadata: waMessage,
    });

    const saved = await this.messageRepo.save(message);

    await this.conversationRepo.update(conversationId, {
      lastMessageAt: new Date(),
      lastMessageContent: message.content || `[${message.type}]`,
    });

    await this.conversationRepo.increment({ id: conversationId }, 'unreadCount', 1);
    await this.notificationsService.notifyNewMessage(conversationId, saved.id, contact);

    return saved;
  }

  async updateStatus(whatsappMessageId: string, status: MessageStatus): Promise<void> {
    await this.messageRepo.update({ whatsappMessageId }, { status });
  }

  async searchMessages(query: string, conversationId?: string) {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.conversation', 'conversation')
      .leftJoinAndSelect('conversation.contact', 'contact')
      .where('m.content ILIKE :query', { query: `%${query}%` })
      .orderBy('m.createdAt', 'DESC')
      .limit(50);

    if (conversationId) qb.andWhere('m.conversationId = :conversationId', { conversationId });

    return qb.getMany();
  }
}
