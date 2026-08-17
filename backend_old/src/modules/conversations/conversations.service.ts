import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationTransfer } from './entities/conversation-transfer.entity';
import { ConversationNote } from './entities/conversation-note.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { ConversationStatus, UserRole } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { IsOptional, IsString, IsUUID, IsEnum, IsBoolean, IsNumber } from 'class-validator';

export class CreateConversationDto {
  @IsString() contactPhone: string;
  @IsString() @IsOptional() contactName?: string;
  @IsUUID() @IsOptional() assignedToId?: string;
  @IsUUID() @IsOptional() departmentId?: string;
}

export class UpdateConversationDto {
  @IsEnum(ConversationStatus) @IsOptional() status?: ConversationStatus;
  @IsUUID() @IsOptional() assignedToId?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsBoolean() @IsOptional() starred?: boolean;
  @IsString() @IsOptional() customStatus?: string;
}

export class TransferConversationDto {
  @IsUUID() @IsOptional() toUserId?: string;
  @IsUUID() @IsOptional() toDepartmentId?: string;
  @IsString() @IsOptional() notes?: string;
}

export class AddNoteDto {
  @IsString() content: string;
}

export class RateConversationDto {
  @IsNumber() rating: number;
  @IsString() @IsOptional() comment?: string;
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationTransfer)
    private readonly transferRepo: Repository<ConversationTransfer>,
    @InjectRepository(ConversationNote)
    private readonly noteRepo: Repository<ConversationNote>,
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateConversationDto, currentUserId: string): Promise<Conversation> {
    const normalizedPhone = dto.contactPhone.replace(/\D/g, '').replace(/^0+/, '');

    let contact = await this.contactRepo.findOne({ where: { phone: normalizedPhone } });
    if (!contact) {
      contact = this.contactRepo.create({ phone: normalizedPhone, name: dto.contactName || normalizedPhone });
      contact = await this.contactRepo.save(contact);
    }

    const existing = await this.conversationRepo.findOne({
      where: {
        contactId: contact.id,
        status: ConversationStatus.IN_PROGRESS,
        assignedToId: currentUserId,
      },
    });
    if (existing) return existing;

    const conversation = this.conversationRepo.create({
      contactId: contact.id,
      assignedToId: dto.assignedToId || currentUserId,
      departmentId: dto.departmentId,
      status: ConversationStatus.NEW,
    });

    const saved = await this.conversationRepo.save(conversation);
    await this.contactRepo.increment({ id: contact.id }, 'conversationCount', 1);
    await this.contactRepo.update(contact.id, { lastContactAt: new Date() });
    return saved;
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    status?: ConversationStatus; assignedToId?: string; departmentId?: string;
    starred?: boolean; currentUser?: any;
  }) {
    const { page = 1, limit = 20, status, assignedToId, departmentId, starred, currentUser } = query;
    const skip = (page - 1) * limit;

    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contact', 'contact')
      .leftJoinAndSelect('c.assignedTo', 'assignedTo')
      .leftJoinAndSelect('c.department', 'department')
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (currentUser?.role === UserRole.AGENT) {
      qb.andWhere('c.assignedToId = :userId', { userId: currentUser.id });
    }

    if (status) qb.andWhere('c.status = :status', { status });
    if (assignedToId) qb.andWhere('c.assignedToId = :assignedToId', { assignedToId });
    if (departmentId) qb.andWhere('c.departmentId = :departmentId', { departmentId });
    if (starred !== undefined) qb.andWhere('c.starred = :starred', { starred });

    if (query.search) {
      qb.andWhere(
        '(contact.name ILIKE :s OR contact.phone ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['contact', 'assignedTo', 'department', 'assignedTo.department'],
    });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');

    await this.conversationRepo.update(id, { unreadCount: 0 });
    conversation.unreadCount = 0;
    return conversation;
  }

  async update(id: string, dto: UpdateConversationDto, currentUser: any): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');

    if (dto.status === ConversationStatus.RESOLVED && !conversation.resolvedAt) {
      dto['resolvedAt'] = new Date();
    }
    if (dto.status === ConversationStatus.CLOSED && !conversation.closedAt) {
      dto['closedAt'] = new Date();
    }

    Object.assign(conversation, dto);
    const updated = await this.conversationRepo.save(conversation);

    if (dto.assignedToId && dto.assignedToId !== conversation.assignedToId) {
      await this.notificationsService.notifyConversationAssigned(id, dto.assignedToId, currentUser.id);
    }

    return updated;
  }

  async transfer(id: string, dto: TransferConversationDto, currentUserId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');

    const transfer = this.transferRepo.create({
      conversationId: id,
      fromUserId: currentUserId,
      toUserId: dto.toUserId,
      toDepartmentId: dto.toDepartmentId,
      notes: dto.notes,
    });
    await this.transferRepo.save(transfer);

    if (dto.toUserId) conversation.assignedToId = dto.toUserId;
    if (dto.toDepartmentId) conversation.departmentId = dto.toDepartmentId;
    conversation.status = ConversationStatus.IN_PROGRESS;
    const updated = await this.conversationRepo.save(conversation);

    if (dto.toUserId) {
      await this.notificationsService.notifyConversationTransferred(id, dto.toUserId, currentUserId, dto.notes);
    }

    return updated;
  }

  async addNote(conversationId: string, dto: AddNoteDto, userId: string): Promise<ConversationNote> {
    const exists = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!exists) throw new NotFoundException('المحادثة غير موجودة');

    const note = this.noteRepo.create({ conversationId, userId, content: dto.content });
    return this.noteRepo.save(note);
  }

  async getNotes(conversationId: string): Promise<ConversationNote[]> {
    return this.noteRepo.find({
      where: { conversationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTransfers(conversationId: string): Promise<ConversationTransfer[]> {
    return this.transferRepo.find({
      where: { conversationId },
      relations: ['fromUser', 'toUser', 'toDepartment'],
      order: { createdAt: 'DESC' },
    });
  }

  async rate(conversationId: string, dto: RateConversationDto): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException();
    conversation.rating = dto.rating;
    conversation.ratingComment = dto.comment;
    conversation.ratedAt = new Date();
    return this.conversationRepo.save(conversation);
  }

  async autoAssign(conversationId: string, departmentId?: string): Promise<void> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select('u.id', 'id')
      .addSelect('COUNT(c.id)', 'activeCount')
      .from('users', 'u')
      .leftJoin('conversations', 'c', 'c.assigned_to_id = u.id AND c.status IN (:...statuses)', {
        statuses: [ConversationStatus.NEW, ConversationStatus.IN_PROGRESS],
      })
      .where('u."isActive" = true AND u.role = :role', { role: 'agent' })
      .groupBy('u.id')
      .orderBy('"activeCount"', 'ASC')
      .limit(1);

    if (departmentId) {
      qb.andWhere('u.department_id = :departmentId', { departmentId });
    }

    const result = await qb.getRawOne();
    if (result) {
      await this.conversationRepo.update(conversationId, {
        assignedToId: result.id,
        status: ConversationStatus.IN_PROGRESS,
      });
    }
  }

  async getStats() {
    const byStatus = await this.conversationRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany();

    const total = await this.conversationRepo.count();
    const unassigned = await this.conversationRepo.count({ where: { assignedToId: null, status: ConversationStatus.NEW } });

    return { total, unassigned, byStatus };
  }
}
