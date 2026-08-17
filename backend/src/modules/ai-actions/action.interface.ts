import { Conversation } from "@/modules/conversations/entities/conversation.entity";

export interface ActionContext {
  tenantId: string;
  conversation: Conversation;
  aiSessionId: string;
}

export type ActionResult = Record<string, unknown>;

/**
 * One whitelisted AI Action. `inputSchema` is a JSON Schema used both to
 * describe the tool to the LLM and to validate its arguments before
 * `handler` ever runs — see docs/architecture/06-ai-agent-architecture.md § 5.
 */
export interface ActionDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler(
    input: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult>;
}

export const ACTION_DEFINITIONS = Symbol("ACTION_DEFINITIONS");

/** Thrown by a handler for an action whose backing system isn't built yet — logged as ai_actions.status = 'rejected', not 'failed'. */
export class ActionNotImplementedError extends Error {}
