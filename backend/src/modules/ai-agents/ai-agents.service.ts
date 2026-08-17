import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiAgent } from "./entities/ai-agent.entity";
import { CreateAiAgentDto } from "./dto/create-ai-agent.dto";
import { UpdateAiAgentDto } from "./dto/update-ai-agent.dto";

@Injectable()
export class AiAgentsService {
  constructor(
    @InjectRepository(AiAgent)
    private readonly repo: Repository<AiAgent>,
  ) {}

  findAll(tenantId: string): Promise<AiAgent[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<AiAgent> {
    const agent = await this.repo.findOne({ where: { id, tenantId } });
    if (!agent) throw new NotFoundException("AI agent not found");
    return agent;
  }

  /** Unscoped lookup for internal callers (chatbot engine, WhatsApp dispatch) that already resolved the id from a tenant-scoped record. */
  findByIdUnscoped(id: string): Promise<AiAgent | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(tenantId: string, dto: CreateAiAgentDto): Promise<AiAgent> {
    const agent = this.repo.create({ ...dto, tenantId });
    return this.repo.save(agent);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateAiAgentDto,
  ): Promise<AiAgent> {
    await this.findOne(tenantId, id); // tenant-scope check
    await this.repo.update(id, dto);
    return this.findOne(tenantId, id);
  }
}
