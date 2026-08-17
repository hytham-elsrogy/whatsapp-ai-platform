import { Injectable } from '@nestjs/common';
import { IntegrationExecutorService } from '@/modules/integrations/integration-executor.service';
import { ActionContext, ActionDefinition, ActionResult } from '../action.interface';

/**
 * The four HIS-backed actions from docs/architecture/06-ai-agent-architecture.md
 * § 5, all routed through the Integration Layer (integrationType='his') built
 * in this phase rather than calling anything external directly — see
 * IntegrationExecutorService. Each returns `{success:false, reason}` (not a
 * thrown error) when no active "his" integration is configured for the
 * tenant, which is a legitimate, expected state, not a bug.
 */

@Injectable()
export class CheckAppointmentAction implements ActionDefinition {
  name = 'checkAppointment';
  description = "Check a patient's existing appointments.";
  inputSchema = {
    type: 'object' as const,
    properties: { patientId: { type: 'string' }, date: { type: 'string', description: 'ISO date, optional' } },
    required: ['patientId'],
  };

  constructor(private readonly integrationExecutor: IntegrationExecutorService) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const result = await this.integrationExecutor.execute(ctx.tenantId, 'his', this.name, input);
    return result.ok ? { success: true, ...(result.body as object) } : { success: false, reason: result.error };
  }
}

@Injectable()
export class GetDoctorScheduleAction implements ActionDefinition {
  name = 'getDoctorSchedule';
  description = "Look up a doctor's available schedule slots.";
  inputSchema = {
    type: 'object' as const,
    properties: { doctorId: { type: 'string' } },
    required: ['doctorId'],
  };

  constructor(private readonly integrationExecutor: IntegrationExecutorService) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const result = await this.integrationExecutor.execute(ctx.tenantId, 'his', this.name, input);
    return result.ok ? { success: true, ...(result.body as object) } : { success: false, reason: result.error };
  }
}

@Injectable()
export class GetPatientInfoAction implements ActionDefinition {
  name = 'getPatientInfo';
  description = "Look up a patient's record (PII-minimized).";
  inputSchema = {
    type: 'object' as const,
    properties: { patientId: { type: 'string' } },
    required: ['patientId'],
  };

  constructor(private readonly integrationExecutor: IntegrationExecutorService) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const result = await this.integrationExecutor.execute(ctx.tenantId, 'his', this.name, input);
    return result.ok ? { success: true, ...(result.body as object) } : { success: false, reason: result.error };
  }
}

@Injectable()
export class CreateAppointmentRequestAction implements ActionDefinition {
  name = 'createAppointmentRequest';
  description = 'File a new appointment request for a patient.';
  inputSchema = {
    type: 'object' as const,
    properties: {
      patientId: { type: 'string' },
      doctorId: { type: 'string' },
      preferredDate: { type: 'string' },
    },
    required: ['patientId', 'doctorId'],
  };

  constructor(private readonly integrationExecutor: IntegrationExecutorService) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const result = await this.integrationExecutor.execute(ctx.tenantId, 'his', this.name, input);
    return result.ok ? { success: true, ...(result.body as object) } : { success: false, reason: result.error };
  }
}
