import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  EmbeddingProvider,
  LLMProviderError,
} from "../interfaces/llm-provider.interface";

/**
 * Anthropic has no public embeddings endpoint, so RAG embeddings go through
 * OpenAI regardless of AI_PROVIDER — see docs/architecture/06-ai-agent-architecture.md § 9.
 * text-embedding-3-small outputs 1536 dims, matching embeddings.vector exactly.
 */
@Injectable()
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  private readonly apiKey: string;
  readonly modelName: string;
  readonly dimensions = 1536;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("embedding.apiKey", "");
    this.modelName = this.configService.get<string>(
      "embedding.model",
      "text-embedding-3-small",
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new LLMProviderError(401, "EMBEDDING_API_KEY is not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: this.modelName, input: texts }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error?.message || response.statusText;
      this.logger.warn(
        `OpenAI embeddings API ${response.status}: ${errorMessage}`,
      );
      throw new LLMProviderError(response.status, errorMessage);
    }

    return (payload.data as Array<{ embedding: number[] }>).map(
      (d) => d.embedding,
    );
  }
}
