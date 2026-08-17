import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Ajv from 'ajv';
import { LLMToolDef } from '@/modules/llm/interfaces/llm-provider.interface';
import { AiAction } from './entities/ai-action.entity';
import { ActionContext, ActionDefinition, ActionNotImplementedError } from './action.interface';
import { GetDepartmentAction } from './actions/get-department.action';
import { AssignDepartmentAction } from './actions/assign-department.action';
import { AssignAgentAction } from './actions/assign-agent.action';
import { CreateTicketAction } from './actions/create-ticket.action';
import { SendTemplateAction } from './actions/send-template.action';
import {
  CheckAppointmentAction,
  CreateAppointmentRequestAction,
  GetDoctorScheduleAction,
  GetPatientInfoAction,
} from './actions/his-actions';

export interface ActionExecutionResult {
  status: 'success' | 'failed' | 'rejected';
  output: Record<string, unknown>;
}

const ajv = new Ajv({ allErrors: true, strict: false });

/**
 * Central gate for every AI Action. An action name not present in the
 * calling ai_agents.allowed_actions whitelist is rejected here, before any
 * handler runs — no LLM tool-call handler ever reaches a handler directly.
 * See docs/architecture/06-ai-agent-architecture.md § 5.
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);
  private readonly registry = new Map<string, ActionDefinition>();

  constructor(
    @InjectRepository(AiAction)
    private readonly actionRepo: Repository<AiAction>,
    getDepartment: GetDepartmentAction,
    assignDepartment: AssignDepartmentAction,
    assignAgent: AssignAgentAction,
    createTicket: CreateTicketAction,
    sendTemplate: SendTemplateAction,
    checkAppointment: CheckAppointmentAction,
    getDoctorSchedule: GetDoctorScheduleAction,
    getPatientInfo: GetPatientInfoAction,
    createAppointmentRequest: CreateAppointmentRequestAction,
  ) {
    const definitions: ActionDefinition[] = [
      getDepartment,
      assignDepartment,
      assignAgent,
      createTicket,
      sendTemplate,
      checkAppointment,
      getDoctorSchedule,
      getPatientInfo,
      createAppointmentRequest,
    ];
    for (const def of definitions) this.registry.set(def.name, def);
  }

  getToolDefs(allowedActionNames: string[]): LLMToolDef[] {
    return allowedActionNames
      .map((name) => this.registry.get(name))
      .filter((def): def is ActionDefinition => Boolean(def))
      .map((def) => ({ name: def.name, description: def.description, inputSchema: def.inputSchema }));
  }

  async execute(
    actionName: string,
    input: Record<string, unknown>,
    ctx: ActionContext,
    allowedActionNames: string[],
  ): Promise<ActionExecutionResult> {
    const record = await this.actionRepo.save(
      this.actionRepo.create({ aiSessionId: ctx.aiSessionId, actionName, input, status: 'pending' }),
    );

    const result = await this.run(actionName, input, ctx, allowedActionNames);

    // TypeORM's QueryDeepPartialEntity can't express a plain jsonb Record value.
    await this.actionRepo.update(record.id, { status: result.status, output: result.output } as any);
    return result;
  }

  private async run(
    actionName: string,
    input: Record<string, unknown>,
    ctx: ActionContext,
    allowedActionNames: string[],
  ): Promise<ActionExecutionResult> {
    if (!allowedActionNames.includes(actionName)) {
      this.logger.warn(`Action "${actionName}" rejected — not in this AI agent's whitelist`);
      return { status: 'rejected', output: { reason: 'not_whitelisted' } };
    }

    const definition = this.registry.get(actionName);
    if (!definition) {
      this.logger.warn(`Action "${actionName}" rejected — unknown action`);
      return { status: 'rejected', output: { reason: 'unknown_action' } };
    }

    const validate = ajv.compile(definition.inputSchema);
    if (!validate(input)) {
      this.logger.warn(`Action "${actionName}" rejected — schema validation failed: ${ajv.errorsText(validate.errors)}`);
      return { status: 'rejected', output: { reason: 'invalid_input', errors: validate.errors } };
    }

    try {
      const output = await definition.handler(input, ctx);
      return { status: 'success', output };
    } catch (error) {
      if (error instanceof ActionNotImplementedError) {
        return { status: 'rejected', output: { reason: 'not_implemented', message: error.message } };
      }
      this.logger.error(`Action "${actionName}" failed: ${(error as Error).message}`);
      return { status: 'failed', output: { message: (error as Error).message } };
    }
  }
}
