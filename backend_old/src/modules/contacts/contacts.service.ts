import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import {
  IsString, IsOptional, IsEmail, IsArray, IsBoolean,
} from 'class-validator';

export class CreateContactDto {
  @IsString() phone: string;
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsArray() @IsOptional() tags?: string[];
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() country?: string;
}

export class UpdateContactDto {
  @IsString() @IsOptional() name?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsArray() @IsOptional() tags?: string[];
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() label?: string;
  @IsString() @IsOptional() company?: string;
  @IsBoolean() @IsOptional() isBlocked?: boolean;
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async findOrCreate(phone: string, name?: string): Promise<Contact> {
    let contact = await this.contactRepository.findOne({ where: { phone } });
    if (!contact) {
      contact = this.contactRepository.create({ phone, name: name || phone });
      contact = await this.contactRepository.save(contact);
    }
    return contact;
  }

  async create(dto: CreateContactDto): Promise<Contact> {
    const normalized = this.normalizePhone(dto.phone);
    const existing = await this.contactRepository.findOne({ where: { phone: normalized } });
    if (existing) throw new ConflictException('رقم الهاتف مستخدم بالفعل');

    const contact = this.contactRepository.create({ ...dto, phone: normalized });
    return this.contactRepository.save(contact);
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    label?: string; isBlocked?: boolean;
  }) {
    const { page = 1, limit = 20, search, label, isBlocked } = query;
    const skip = (page - 1) * limit;

    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .orderBy('contact.lastContactAt', 'DESC', 'NULLS LAST')
      .addOrderBy('contact.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(contact.name ILIKE :s OR contact.phone ILIKE :s OR contact.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (label) qb.andWhere('contact.label = :label', { label });
    if (isBlocked !== undefined) qb.andWhere('contact.isBlocked = :isBlocked', { isBlocked });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({ where: { id } });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');
    return contact;
  }

  async findByPhone(phone: string): Promise<Contact | null> {
    return this.contactRepository.findOne({ where: { phone: this.normalizePhone(phone) } });
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.findOne(id);
    Object.assign(contact, dto);
    return this.contactRepository.save(contact);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepository.remove(contact);
  }

  async incrementConversationCount(contactId: string): Promise<void> {
    await this.contactRepository.increment({ id: contactId }, 'conversationCount', 1);
    await this.contactRepository.update(contactId, { lastContactAt: new Date() });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^0+/, '');
  }
}
