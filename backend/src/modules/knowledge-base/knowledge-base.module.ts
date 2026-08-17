import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LlmModule } from "@/modules/llm/llm.module";
import { KnowledgeBase } from "./entities/knowledge-base.entity";
import { KbDocument } from "./entities/kb-document.entity";
import { DocumentChunk } from "./entities/document-chunk.entity";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { DocumentsService } from "./documents.service";
import { EmbeddingsRepository } from "./embeddings.repository";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { DocumentsController } from "./documents.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeBase, KbDocument, DocumentChunk]),
    LlmModule,
  ],
  providers: [KnowledgeBaseService, DocumentsService, EmbeddingsRepository],
  controllers: [KnowledgeBaseController, DocumentsController],
  exports: [KnowledgeBaseService, DocumentsService, EmbeddingsRepository],
})
export class KnowledgeBaseModule {}
