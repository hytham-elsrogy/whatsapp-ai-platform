export type LLMContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolCallId: string; content: string };

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string | LLMContentBlock[];
}

export interface LLMToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResult {
  toolCallId: string;
  content: string;
}

export interface LLMCompleteParams {
  model: string;
  systemPrompt: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LLMToolDef[];
  /** Force the model to call exactly this tool (used for structured output like intent classification). */
  forceTool?: string;
}

export interface LLMResponse {
  text: string;
  toolCalls: LLMToolCall[];
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
}

export class LLMProviderError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export interface LLMProvider {
  complete(params: LLMCompleteParams): Promise<LLMResponse>;
}

export interface EmbeddingProvider {
  readonly dimensions: number;
  readonly modelName: string;
  embed(texts: string[]): Promise<number[][]>;
}
