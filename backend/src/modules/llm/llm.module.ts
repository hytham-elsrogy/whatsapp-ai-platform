import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AnthropicLLMProvider } from "./providers/anthropic-llm.provider";
import { OpenAIEmbeddingProvider } from "./providers/openai-embedding.provider";
import { LLM_PROVIDER, EMBEDDING_PROVIDER } from "./llm.tokens";

/**
 * AIProviderAdapter — selects the concrete LLMProvider/EmbeddingProvider
 * implementation from AI_PROVIDER/EMBEDDING_PROVIDER env vars. Nothing
 * outside this module ever imports a provider class directly; consumers
 * inject LLM_PROVIDER / EMBEDDING_PROVIDER. See
 * docs/architecture/06-ai-agent-architecture.md § 1.
 */
@Module({
  providers: [
    AnthropicLLMProvider,
    OpenAIEmbeddingProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: (
        configService: ConfigService,
        anthropic: AnthropicLLMProvider,
      ) => {
        const provider = configService.get<string>("ai.provider", "anthropic");
        if (provider === "anthropic") return anthropic;
        throw new Error(
          `Unsupported AI_PROVIDER "${provider}" — only "anthropic" is implemented`,
        );
      },
      inject: [ConfigService, AnthropicLLMProvider],
    },
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (
        configService: ConfigService,
        openai: OpenAIEmbeddingProvider,
      ) => {
        const provider = configService.get<string>(
          "embedding.provider",
          "openai",
        );
        if (provider === "openai") return openai;
        throw new Error(
          `Unsupported EMBEDDING_PROVIDER "${provider}" — only "openai" is implemented`,
        );
      },
      inject: [ConfigService, OpenAIEmbeddingProvider],
    },
  ],
  exports: [LLM_PROVIDER, EMBEDDING_PROVIDER],
})
export class LlmModule {}
