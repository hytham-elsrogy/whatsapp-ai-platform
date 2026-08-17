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
 * The `custom` integration type — a plain REST call. `config.endpoints`
 * maps an abstract action name (e.g. "checkAppointment") to a path; the
 * params object is sent as the JSON body of a POST to `baseUrl + path`.
 * This is the one adapter that's actually testable end-to-end in a dev
 * environment with no real HIS/Odoo/APEX system — point it at any real
 * HTTP endpoint.
 */
@Injectable()
export class GenericHttpAdapter implements IntegrationAdapter {
  constructor(
    @Inject(SECRETS_PROVIDER) private readonly secretsProvider: SecretsProvider,
  ) {}

  async execute(
    config: IntegrationConfig,
    action: string,
    params: Record<string, unknown>,
  ): Promise<AdapterCallResult> {
    const path = config.endpoints?.[action];
    if (!path) {
      throw new IntegrationCallError(
        400,
        `No endpoint configured for action "${action}"`,
      );
    }

    const token = await this.secretsProvider.getSecret(config.secretRef);
    const response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new IntegrationCallError(
        response.status,
        `Generic HTTP integration call failed: ${response.statusText}`,
      );
    }
    return { statusCode: response.status, body };
  }
}
