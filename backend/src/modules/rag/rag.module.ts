import { Module } from '@nestjs/common';
import { LlmModule } from '@/modules/llm/llm.module';
import { KnowledgeBaseModule } from '@/modules/knowledge-base/knowledge-base.module';
import { RetrieverService } from './retriever.service';

@Module({
  imports: [LlmModule, KnowledgeBaseModule],
  providers: [RetrieverService],
  exports: [RetrieverService],
})
export class RagModule {}
