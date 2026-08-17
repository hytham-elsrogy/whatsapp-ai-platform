import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';
import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateTemplateDto {
  @IsString() name: string;
  @IsString() content: string;
  @IsString() @IsOptional() category?: string;
  @IsBoolean() @IsOptional() isShared?: boolean;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsBoolean() @IsOptional() isWhatsappTemplate?: boolean;
  @IsString() @IsOptional() whatsappTemplateName?: string;
  @IsString() @IsOptional() language?: string;
  @IsOptional() components?: any;
}

export class UpdateTemplateDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() content?: string;
  @IsString() @IsOptional() category?: string;
  @IsBoolean() @IsOptional() isShared?: boolean;
}

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepo: Repository<Template>,
  ) {}

  async create(dto: CreateTemplateDto, userId: string): Promise<Template> {
    const template = this.templateRepo.create({ ...dto, createdById: userId });
    return this.templateRepo.save(template);
  }

  async findAll(query: {
    page?: number; limit?: number; search?: string;
    category?: string; departmentId?: string; userId: string;
  }) {
    const { page = 1, limit = 50, search, category, departmentId, userId } = query;
    const skip = (page - 1) * limit;

    const qb = this.templateRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.createdBy', 'createdBy')
      .where('(t.isShared = true OR t.createdById = :userId)', { userId })
      .orderBy('t.usageCount', 'DESC')
      .addOrderBy('t.name', 'ASC')
      .skip(skip)
      .take(limit);

    if (search) qb.andWhere('(t.name ILIKE :s OR t.content ILIKE :s)', { s: `%${search}%` });
    if (category) qb.andWhere('t.category = :category', { category });
    if (departmentId) qb.andWhere('(t.departmentId = :departmentId OR t.departmentId IS NULL)', { departmentId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('القالب غير موجود');
    return template;
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async remove(id: string): Promise<void> {
    await this.templateRepo.delete(id);
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateRepo.increment({ id }, 'usageCount', 1);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.templateRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.category', 'category')
      .where('t.category IS NOT NULL')
      .getRawMany();
    return result.map((r) => r.category).filter(Boolean);
  }
}
