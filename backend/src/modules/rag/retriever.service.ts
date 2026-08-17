import { Inject, Injectable } from '@nestjs/common';
import { EmbeddingProvider } from '@/modules/llm/interfaces/llm-provider.interface';
import { EMBEDDING_PROVIDER } from '@/modules/llm/llm.tokens';
import { EmbeddingsRepository } from '@/modules/knowledge-base/embeddings.repository';

export interface RetrievedContext {
  content: string;
  sourceRef: string;
  distance: number;
}

const DEFAULT_TOP_K = 5;

/**
 * Retriever — top-k cosine similarity search restricted to one
 * knowledge_base_id per call, so a department's RAG context can never leak
 * chunks from another department's KB. See
 * docs/architecture/06-ai-agent-architecture.md § 9.
 */
@Injectable()
export class RetrieverService {
  constructor(
    private readonly embeddingsRepository: EmbeddingsRepository,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  async retrieve(
    knowledgeBaseId: string,
    query: string,
    topK: number = DEFAULT_TOP_K,
  ): Promise<RetrievedContext[]> {
    const [queryVector] = await this.embeddingProvider.embed([query]);
    const chunks = await this.embeddingsRepository.searchByKnowledgeBase(
      knowledgeBaseId,
      queryVector,
      topK,
    );
    return chunks.map((c) => ({
      content: c.content,
      sourceRef: `Knowledge Base – ${c.documentTitle}`,
      distance: c.distance,
    }));
  }
}
