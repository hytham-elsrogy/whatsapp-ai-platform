import { Inject, Injectable } from "@nestjs/common";
import { SecretsProvider } from "@/modules/secrets/secrets-provider.interface";
import { SECRETS_PROVIDER } from "@/modules/secrets/secrets.tokens";
import { IntegrationConfig } from "../entities/integration.entity";
import {
  AdapterCallResult,
  IntegrationAdapter,
  IntegrationCallError,
} from "./integration-adapter.interface";

/**
 * Real Odoo external API shape — JSON-RPC 2.0 over HTTP calling
 * `execute_kw` on `object`, Odoo's standard way to invoke any model method
 * remotely (https://www.odoo.com/documentation/17.0/developer/reference/external_api.html).
 * `config.endpoints[action]` maps the abstract action name to
 * `"<model>.<method>"` (e.g. "calendar.event.search_read" for checkAppointment).
 * No real Odoo server is reachable in this dev environment, so this call is
 * expected to fail with a real connection/JSON-RPC error, not a mock.
 */
@Injectable()
export class OdooAdapter implements IntegrationAdapter {
  constructor(
    @Inject(SECRETS_PROVIDER) private readonly secretsProvider: SecretsProvider,
  ) {}

  async execute(
    config: IntegrationConfig,
    action: string,
    params: Record<string, unknown>,
  ): Promise<AdapterCallResult> {
    const modelMethod = config.endpoints?.[action];
    if (!modelMethod) {
      throw new IntegrationCallError(
        400,
        `No model.method mapping configured for action "${action}"`,
      );
    }
    const lastDot = modelMethod.lastIndexOf(".");
    const model = modelMethod.slice(0, lastDot);
    const method = modelMethod.slice(lastDot + 1);

    const password =
      (await this.secretsProvider.getSecret(config.secretRef)) ?? "";
    const uid = await this.authenticate(config, password);

    const response = await fetch(`${config.baseUrl}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            config.database,
            uid,
            password,
            model,
            method,
            [Object.values(params)],
          ],
        },
        id: Date.now(),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      throw new IntegrationCallError(
        response.status || 502,
        `Odoo call failed: ${payload.error?.data?.message || payload.error?.message || response.statusText}`,
      );
    }
    return { statusCode: response.status, body: payload.result };
  }

  private async authenticate(
    config: IntegrationConfig,
    password: string,
  ): Promise<number> {
    const response = await fetch(`${config.baseUrl}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [config.database, config.username, password, {}],
        },
        id: Date.now(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error || !payload.result) {
      throw new IntegrationCallError(
        response.status || 502,
        `Odoo authentication failed: ${payload.error?.data?.message || payload.error?.message || response.statusText}`,
      );
    }
    return payload.result as number;
  }
}
