import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IntegrationsService } from "./integrations.service";
import { GenericHttpAdapter } from "./adapters/generic-http.adapter";
import { OdooAdapter } from "./adapters/odoo.adapter";
import { OracleApexAdapter } from "./adapters/oracle-apex.adapter";
import {
  IntegrationAdapter,
  IntegrationCallError,
} from "./adapters/integration-adapter.interface";
import { ApiLog } from "./entities/api-log.entity";
import { Integration, IntegrationType } from "./entities/integration.entity";

export interface IntegrationExecutionResult {
  ok: boolean;
  body?: unknown;
  error?: string;
}

/**
 * Every AI Action (and eventually chatbot api_call/db_query nodes) that
 * needs an external system goes through here, never through an adapter
 * directly — see docs/architecture/01-system-architecture.md § 4 "كل
 * الاتصال الخارجي يمر عبر Integration Layer موحّد". Logs every attempt to
 * api_logs regardless of outcome.
 */
@Injectable()
export class IntegrationExecutorService {
  private readonly logger = new Logger(IntegrationExecutorService.name);
  private readonly adapters: Record<IntegrationType, IntegrationAdapter>;

  constructor(
    @InjectRepository(ApiLog)
    private readonly apiLogRepo: Repository<ApiLog>,
    private readonly integrationsService: IntegrationsService,
    genericHttpAdapter: GenericHttpAdapter,
    odooAdapter: OdooAdapter,
    oracleApexAdapter: OracleApexAdapter,
  ) {
    this.adapters = {
      odoo: odooAdapter,
      oracle_apex: oracleApexAdapter,
      his: genericHttpAdapter,
      custom: genericHttpAdapter,
    };
  }

  async execute(
    tenantId: string,
    integrationType: IntegrationType,
    action: string,
    params: Record<string, unknown>,
  ): Promise<IntegrationExecutionResult> {
    const integration = await this.integrationsService.findActiveByType(
      tenantId,
      integrationType,
    );
    if (!integration) {
      return {
        ok: false,
        error: `No active "${integrationType}" integration configured for this tenant`,
      };
    }
    return this.callAdapter(tenantId, integration, action, params);
  }

  /** Bypasses the active-status requirement — used to verify a connection before flipping it to active. */
  testConnection(
    tenantId: string,
    integration: Integration,
    action: string,
    params: Record<string, unknown>,
  ): Promise<IntegrationExecutionResult> {
    return this.callAdapter(tenantId, integration, action, params);
  }

  private async callAdapter(
    tenantId: string,
    integration: Integration,
    action: string,
    params: Record<string, unknown>,
  ): Promise<IntegrationExecutionResult> {
    const adapter = this.adapters[integration.type];
    const startedAt = Date.now();
    let statusCode: number | null = null;

    try {
      const result = await adapter.execute(integration.config, action, params);
      statusCode = result.statusCode;
      return { ok: true, body: result.body };
    } catch (error) {
      if (error instanceof IntegrationCallError) {
        statusCode = error.statusCode;
        this.logger.warn(
          `Integration call failed [${integration.type}/${action}]: ${error.message}`,
        );
        return { ok: false, error: error.message };
      }
      throw error;
    } finally {
      await this.logCall(
        tenantId,
        integration,
        action,
        statusCode,
        Date.now() - startedAt,
      );
    }
  }

  private async logCall(
    tenantId: string,
    integration: Integration,
    action: string,
    statusCode: number | null,
    durationMs: number,
  ): Promise<void> {
    await this.apiLogRepo.save(
      this.apiLogRepo.create({
        tenantId,
        integrationId: integration.id,
        endpoint: action,
        method: "POST",
        statusCode,
        durationMs,
      }),
    );
  }
}
