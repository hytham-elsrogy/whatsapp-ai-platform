import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationType } from './entities/integration.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Integration)
    private readonly repo: Repository<Integration>,
  ) {}

  findAll(tenantId: string): Promise<Integration[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async findOne(tenantId: string, id: string): Promise<Integration> {
    const integration = await this.repo.findOne({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');
    return integration;
  }

  /** Used by ActionExecutor callers — the active integration of a given type for this tenant, or null if none configured. */
  findActiveByType(tenantId: string, type: IntegrationType): Promise<Integration | null> {
    return this.repo.findOne({ where: { tenantId, type, status: 'active' } });
  }

  create(tenantId: string, dto: CreateIntegrationDto): Promise<Integration> {
    return this.repo.save(this.repo.create({ ...dto, tenantId }));
  }

  async update(tenantId: string, id: string, dto: Partial<CreateIntegrationDto>): Promise<Integration> {
    await this.findOne(tenantId, id); // tenant-scope check
    await this.repo.update(id, dto);
    return this.findOne(tenantId, id);
  }
}
