import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  LLMContentBlock,
  LLMMessage,
  LLMProvider,
  LLMProviderError,
} from "@/modules/llm/interfaces/llm-provider.interface";
import { LLM_PROVIDER } from "@/modules/llm/llm.tokens";
import {
  RetrieverService,
  RetrievedContext,
} from "@/modules/rag/retriever.service";
import { ActionExecutorService } from "@/modules/ai-actions/action-executor.service";
import { ActionContext } from "@/modules/ai-actions/action.interface";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { AssignmentService } from "@/modules/assignment/assignment.service";
import { DepartmentsService } from "@/modules/departments/departments.service";
import { MetaApiError, MetaService } from "@/modules/meta/meta.service";
import { WhatsappNumbersService } from "@/modules/whatsapp-numbers/whatsapp-numbers.service";
import { MessagesService } from "@/modules/messages/messages.service";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { AiSession } from "./entities/ai-session.entity";
import { AiMessage, AiMessageRole } from "./entities/ai-message.entity";
import { AiAgent, GuardrailRules } from "./entities/ai-agent.entity";
import { AiAgentsService } from "./ai-agents.service";

const MAX_TOOL_ROUNDS = 3;
const INTENT_OPTIONS = [
  "appointment_booking",
  "appointment_cancellation",
  "appointment_rescheduling",
  "price_inquiry",
  "location",
  "working_hours",
  "insurance",
  "laboratory",
  "radiology",
  "pharmacy",
  "complaint",
  "medical_inquiry",
  "general_inquiry",
  "human_agent_request",
];
const CLASSIFY_INTENT_TOOL = "classify_intent";

// Enforced at the code level regardless of ai_agents.system_prompt content —
// not something an admin can remove by editing the prompt. See
// docs/architecture/06-ai-agent-architecture.md § 4.
const HARDCODED_GUARDRAILS = `
Non-negotiable rules enforced outside your control:
- Never provide a medical diagnosis.
- Never prescribe medication or change a dosage.
If the customer describes a possible medical emergency, do not attempt to diagnose — urge them to seek emergency care immediately; this conversation will be escalated to a human right away.
`.trim();

// Best-effort defense-in-depth net on the OUTPUT, in case the system prompt
// instruction above is disregarded — NOT a substitute for it, and not real
// medical-content classification.
const FORBIDDEN_OUTPUT_PATTERNS = [
  /تشخيص طبي/i,
  /جرعة\s*\d/i,
  /\bmg\b.*\bdaily\b/i,
  /diagnos(is|e)/i,
];

const TRANSFER_REPLY: Record<string, string> = {
  ar: "بالتأكيد، سأقوم بتحويلك إلى أحد موظفي خدمة العملاء.",
  en: "Sure, I'll transfer you to one of our agents now.",
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiSession)
    private readonly sessionRepo: Repository<AiSession>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LLMProvider,
    private readonly retrieverService: RetrieverService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly aiAgentsService: AiAgentsService,
    private readonly conversationsService: ConversationsService,
    private readonly assignmentService: AssignmentService,
    private readonly departmentsService: DepartmentsService,
    private readonly metaService: MetaService,
    private readonly whatsappNumbersService: WhatsappNumbersService,
    private readonly messagesService: MessagesService,
  ) {}

  async findActiveSession(conversationId: string): Promise<AiSession | null> {
    return this.sessionRepo.findOne({
      where: { conversationId, status: "active" },
      order: { startedAt: "DESC" },
    });
  }

  /**
   * Starts an AI session for this conversation. If `messageText` is given,
   * the first turn runs immediately (customer message triggering the
   * hand-off); if omitted (chatbot flow handing off mid-conversation with no
   * fresh message yet), the session just starts and waits for the next
   * inbound message. Returns false without starting anything if the agent
   * is inactive/missing or the department is `human_only`.
   */
  async maybeStartSession(
    conversation: Conversation,
    aiAgentId: string,
    messageText?: string,
  ): Promise<boolean> {
    const aiAgent = await this.aiAgentsService.findByIdUnscoped(aiAgentId);
    if (!aiAgent || !aiAgent.isActive) return false;
    if (conversation.department?.aiReplyMode === "human_only") return false;

    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        conversationId: conversation.id,
        aiAgentId: aiAgent.id,
        status: "active",
      }),
    );
    await this.conversationsService.setAiAgent(conversation.id, aiAgent.id);
    const aiConversation = await this.conversationsService.transition(
      conversation,
      "ai",
      { type: "system" },
    );

    if (messageText !== undefined) {
      await this.runTurn(session, aiAgent, aiConversation, messageText);
    }
    return true;
  }

  async handleMessage(
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    const session = await this.findActiveSession(conversation.id);
    if (!session) return;

    const aiAgent = await this.aiAgentsService.findByIdUnscoped(
      session.aiAgentId,
    );
    if (!aiAgent) {
      await this.escalate(session, conversation, "ai_agent_missing", {});
      return;
    }
    await this.runTurn(session, aiAgent, conversation, messageText);
  }

  private async runTurn(
    session: AiSession,
    aiAgent: AiAgent,
    conversation: Conversation,
    messageText: string,
  ): Promise<void> {
    await this.logMessage(session.id, "user", messageText);
    const guardrails = aiAgent.guardrailRules ?? {};

    // 1. Safety check — non-overridable force-escalation keywords. Deliberately
    // run BEFORE intent detection (the architecture diagram shows it after),
    // so an emergency keyword still escalates immediately even if the LLM
    // provider is unreachable — a guardrail that depended on a successful
    // model call first wouldn't be "non-negotiable".
    const keywords = guardrails.force_escalation_keywords ?? [];
    const matchedKeyword = keywords.find((k) => messageText.includes(k));
    if (matchedKeyword) {
      await this.escalate(
        session,
        conversation,
        `guardrail_keyword:${matchedKeyword}`,
        guardrails,
        "urgent",
      );
      return;
    }

    // 2. Intent detection
    let intent: string;
    let confidence: number;
    try {
      const classified = await this.detectIntent(aiAgent, messageText);
      intent = classified.intent;
      confidence = classified.confidence;
    } catch (error) {
      this.logFailure("intent detection", error);
      await this.escalate(
        session,
        conversation,
        "ai_provider_error",
        guardrails,
      );
      return;
    }
    await this.sessionRepo.update(session.id, { intent, confidence });

    // 2b. Explicit human request — acknowledge, then hand over (§7)
    if (intent === "human_agent_request") {
      const lang = aiAgent.language === "en" ? "en" : "ar";
      await this.sendAiText(conversation, TRANSFER_REPLY[lang]);
      await this.logMessage(session.id, "assistant", TRANSFER_REPLY[lang]);
      await this.escalate(
        session,
        conversation,
        "human_agent_request",
        guardrails,
      );
      return;
    }

    // 3. Confidence gate
    if (confidence < aiAgent.confidenceThreshold) {
      await this.escalate(session, conversation, "low_confidence", guardrails);
      return;
    }

    // 4. Knowledge retrieval (RAG) — skipped, not failed, if no KB is configured
    let context: RetrievedContext[] = [];
    const knowledgeBaseId = conversation.department?.knowledgeBaseId;
    if (knowledgeBaseId) {
      try {
        context = await this.retrieverService.retrieve(
          knowledgeBaseId,
          messageText,
        );
      } catch (error) {
        this.logFailure("RAG retrieval", error);
        // Non-fatal — proceed without retrieved context rather than escalate,
        // an unreachable embeddings provider shouldn't block a reply the LLM
        // can still answer from its system prompt alone.
      }
    }

    // 5. Generation (+ whitelisted tool use)
    const actionCtx: ActionContext = {
      tenantId: conversation.tenantId,
      conversation,
      aiSessionId: session.id,
    };
    let generated: string;
    try {
      const history = await this.buildHistory(session.id);
      const systemPrompt = this.buildSystemPrompt(aiAgent, context);
      generated = await this.generateWithTools(
        aiAgent,
        systemPrompt,
        [...history, { role: "user", content: messageText }],
        actionCtx,
      );
    } catch (error) {
      this.logFailure("generation", error);
      await this.escalate(
        session,
        conversation,
        "ai_provider_error",
        guardrails,
      );
      return;
    }

    // 6. Response validation
    if (!generated || generated.length === 0 || generated.length > 4000) {
      await this.escalate(
        session,
        conversation,
        "response_validation_failed:length",
        guardrails,
      );
      return;
    }
    const forbiddenHit = FORBIDDEN_OUTPUT_PATTERNS.find((p) =>
      p.test(generated),
    );
    if (forbiddenHit) {
      this.logger.warn(
        `AI session ${session.id} generated a response matching a forbidden pattern — escalating`,
      );
      await this.escalate(
        session,
        conversation,
        "response_validation_failed:forbidden_content",
        guardrails,
      );
      return;
    }

    // 7. Policy check — placeholder for a future Compliance Engine; passes through for now.

    // 8. Reply mode — auto sends directly; suggestion drafts for a human instead of sending
    const replyMode = conversation.department?.aiReplyMode ?? "auto";
    const sourceRefs = context.map((c) => c.sourceRef);
    if (replyMode === "suggestion") {
      await this.logMessage(session.id, "assistant", generated, sourceRefs);
      await this.escalate(session, conversation, "suggestion_mode", guardrails);
      return;
    }

    await this.sendAiText(conversation, generated);
    await this.logMessage(session.id, "assistant", generated, sourceRefs);
  }

  private async detectIntent(
    aiAgent: AiAgent,
    messageText: string,
  ): Promise<{ intent: string; confidence: number }> {
    const response = await this.llmProvider.complete({
      model: aiAgent.model,
      systemPrompt:
        "Classify the customer message into exactly one intent with a confidence score.",
      messages: [{ role: "user", content: messageText }],
      temperature: 0,
      maxTokens: 200,
      forceTool: CLASSIFY_INTENT_TOOL,
      tools: [
        {
          name: CLASSIFY_INTENT_TOOL,
          description: "Classify the customer message intent",
          inputSchema: {
            type: "object",
            properties: {
              intent: { type: "string", enum: INTENT_OPTIONS },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["intent", "confidence"],
          },
        },
      ],
    });

    const call = response.toolCalls[0];
    if (!call)
      throw new LLMProviderError(
        502,
        "Model did not return an intent classification",
      );
    return {
      intent: String(call.input.intent),
      confidence: Number(call.input.confidence),
    };
  }

  private async generateWithTools(
    aiAgent: AiAgent,
    systemPrompt: string,
    messages: LLMMessage[],
    actionCtx: ActionContext,
  ): Promise<string> {
    const tools = this.actionExecutor.getToolDefs(aiAgent.allowedActions);
    let working = messages;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await this.llmProvider.complete({
        model: aiAgent.model,
        systemPrompt,
        messages: working,
        temperature: aiAgent.temperature,
        maxTokens: aiAgent.maxTokens,
        tools,
      });

      if (response.toolCalls.length === 0) return response.text;

      const assistantBlocks: LLMContentBlock[] = [];
      if (response.text)
        assistantBlocks.push({ type: "text", text: response.text });
      for (const call of response.toolCalls) {
        assistantBlocks.push({
          type: "tool_use",
          id: call.id,
          name: call.name,
          input: call.input,
        });
      }

      const toolResultBlocks: LLMContentBlock[] = [];
      for (const call of response.toolCalls) {
        const result = await this.actionExecutor.execute(
          call.name,
          call.input,
          actionCtx,
          aiAgent.allowedActions,
        );
        await this.logMessage(
          actionCtx.aiSessionId,
          "tool",
          JSON.stringify({
            name: call.name,
            input: call.input,
            status: result.status,
            output: result.output,
          }),
        );
        toolResultBlocks.push({
          toolCallId: call.id,
          type: "tool_result",
          content: JSON.stringify(result.output),
        });
      }

      working = [
        ...working,
        { role: "assistant", content: assistantBlocks },
        { role: "user", content: toolResultBlocks },
      ];
    }

    throw new Error(
      `Exceeded ${MAX_TOOL_ROUNDS} tool-use rounds without a final reply`,
    );
  }

  private buildSystemPrompt(
    aiAgent: AiAgent,
    context: RetrievedContext[],
  ): string {
    const contextBlock = context.length
      ? `\n\nRelevant knowledge base context:\n${context
          .map((c, i) => `[${i + 1}] (${c.sourceRef})\n${c.content}`)
          .join(
            "\n\n",
          )}\n\nCite sources by their [n] reference when you use them.`
      : "";
    return `${aiAgent.systemPrompt}${contextBlock}\n\n${HARDCODED_GUARDRAILS}`;
  }

  private async buildHistory(aiSessionId: string): Promise<LLMMessage[]> {
    const rows = await this.messageRepo.find({
      where: { aiSessionId },
      order: { createdAt: "ASC" },
    });
    return rows
      .filter((r) => r.role === "user" || r.role === "assistant")
      .map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content,
      }));
  }

  private async logMessage(
    aiSessionId: string,
    role: AiMessageRole,
    content: string,
    sourceRefs?: string[],
  ): Promise<void> {
    await this.messageRepo.save(
      this.messageRepo.create({ aiSessionId, role, content, sourceRefs }),
    );
  }

  private async sendAiText(
    conversation: Conversation,
    text: string,
  ): Promise<void> {
    const whatsappNumber = await this.whatsappNumbersService.findById(
      conversation.whatsappNumberId,
    );
    const accessToken =
      await this.whatsappNumbersService.resolveAccessToken(whatsappNumber);
    try {
      const result = await this.metaService.sendTextMessage(
        whatsappNumber.phoneNumberId,
        accessToken,
        conversation.customer.whatsappNumber,
        text,
      );
      await this.messagesService.create({
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        direction: "outbound",
        senderType: "ai",
        waMessageId: result.messages[0]?.id,
        type: "text",
        content: { body: text },
        status: "sent",
      });
      await this.conversationsService.markFirstResponseIfUnset(conversation);
    } catch (error) {
      if (error instanceof MetaApiError) {
        this.logger.warn(`AI reply send failed (non-fatal): ${error.message}`);
        return;
      }
      throw error;
    }
  }

  private async escalate(
    session: AiSession,
    conversation: Conversation,
    reason: string,
    guardrails: GuardrailRules,
    priorityOverride?: Conversation["priority"],
  ): Promise<void> {
    let targetDepartmentId = conversation.departmentId ?? null;
    if (guardrails.escalation_department) {
      const department = await this.departmentsService.findByName(
        conversation.tenantId,
        guardrails.escalation_department,
      );
      if (department) targetDepartmentId = department.id;
    }

    // guardrails.escalation_priority is only meant to apply to the
    // force-escalation-keyword path (an explicit priorityOverride), not as a
    // blanket default for every escalation reason (low confidence, provider
    // errors, etc. should keep the conversation's normal priority).
    if (priorityOverride) {
      await this.conversationsService.setPriority(
        conversation.id,
        priorityOverride,
      );
    }

    const summary = JSON.stringify({
      intent: session.intent ?? null,
      confidence: session.confidence ?? null,
      reason,
      status: "Waiting for agent",
    });
    await this.sessionRepo.update(session.id, {
      status: "escalated",
      endedAt: new Date(),
      summary,
    });

    if (targetDepartmentId) {
      await this.assignmentService.routeToDepartment(
        conversation,
        targetDepartmentId,
      );
    } else {
      await this.conversationsService.transition(conversation, "waiting", {
        type: "ai",
      });
    }
  }

  private logFailure(stage: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`AI pipeline failed at ${stage}: ${message}`);
  }
}
