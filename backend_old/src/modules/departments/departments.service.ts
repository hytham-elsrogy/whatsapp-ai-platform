import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartmentDto {
  @IsString() name: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() color?: string;
}

export class UpdateDepartmentDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() color?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepository: Repository<Department>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.deptRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('اسم القسم مستخدم بالفعل');
    const dept = this.deptRepository.create(dto);
    return this.deptRepository.save(dept);
  }

  async findAll(includeInactive = false): Promise<Department[]> {
    const where: any = {};
    if (!includeInactive) where.isActive = true;
    return this.deptRepository.find({ where, order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.deptRepository.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('القسم غير موجود');
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findOne(id);
    Object.assign(dept, dto);
    return this.deptRepository.save(dept);
  }

  async remove(id: string): Promise<void> {
    const dept = await this.findOne(id);
    dept.isActive = false;
    await this.deptRepository.save(dept);
  }
}
