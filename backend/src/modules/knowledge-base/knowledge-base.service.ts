import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KnowledgeBase } from "./entities/knowledge-base.entity";
import { CreateKnowledgeBaseDto } from "./dto/create-knowledge-base.dto";

@Injectable()
export class KnowledgeBaseService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly repo: Repository<KnowledgeBase>,
  ) {}

  findAll(tenantId: string): Promise<KnowledgeBase[]> {
    return this.repo.find({
      where: { tenantId },
      order: { createdAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<KnowledgeBase> {
    const kb = await this.repo.findOne({ where: { id, tenantId } });
    if (!kb) throw new NotFoundException("Knowledge base not found");
    return kb;
  }

  create(
    tenantId: string,
    dto: CreateKnowledgeBaseDto,
  ): Promise<KnowledgeBase> {
    const kb = this.repo.create({ ...dto, tenantId });
    return this.repo.save(kb);
  }
}
