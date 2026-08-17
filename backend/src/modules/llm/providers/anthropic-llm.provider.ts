import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LLMCompleteParams,
  LLMContentBlock,
  LLMProvider,
  LLMProviderError,
  LLMResponse,
  LLMToolCall,
} from '../interfaces/llm-provider.interface';

const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/**
 * Thin wrapper around the Anthropic Messages API — the only place in the
 * codebase that talks to api.anthropic.com. Selected when AI_PROVIDER=anthropic;
 * see docs/architecture/06-ai-agent-architecture.md § 1.
 */
@Injectable()
export class AnthropicLLMProvider implements LLMProvider {
  private readonly logger = new Logger(AnthropicLLMProvider.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ai.apiKey', '');
  }

  async complete(params: LLMCompleteParams): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new LLMProviderError(401, 'AI_API_KEY is not configured');
    }

    const body: Record<string, unknown> = {
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages.map((m) => ({ role: m.role, content: this.toAnthropicContent(m.content) })),
      max_tokens: params.maxTokens ?? 800,
      temperature: params.temperature ?? 0.3,
    };
    if (params.tools?.length) {
      body.tools = params.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      }));
    }
    if (params.forceTool) {
      body.tool_choice = { type: 'tool', name: params.forceTool };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload?.error?.message || response.statusText;
      this.logger.warn(`Anthropic API ${response.status}: ${errorMessage}`);
      throw new LLMProviderError(response.status, errorMessage);
    }

    const blocks: AnthropicContentBlock[] = payload.content ?? [];
    const text = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
      .trim();
    const toolCalls: LLMToolCall[] = blocks
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id!, name: b.name!, input: b.input ?? {} }));

    return {
      text,
      toolCalls,
      stopReason: payload.stop_reason ?? 'end_turn',
      usage: {
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
      },
    };
  }

  private toAnthropicContent(content: string | LLMContentBlock[]): unknown {
    if (typeof content === 'string') return content;
    return content.map((block) => {
      if (block.type === 'text') return { type: 'text', text: block.text };
      if (block.type === 'tool_use') {
        return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
      }
      return { type: 'tool_result', tool_use_id: block.toolCallId, content: block.content };
    });
  }
}
