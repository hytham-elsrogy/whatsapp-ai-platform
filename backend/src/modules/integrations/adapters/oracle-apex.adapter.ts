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
 * Real Oracle REST Data Services (ORDS) call shape:
 * `POST {baseUrl}/ords/{schema}/{module}/{action}` with HTTP Basic Auth —
 * the standard way ORDS exposes REST endpoints in front of Oracle APEX/HIS
 * databases. `config.endpoints[action]` maps to the module/resource path.
 * No real Oracle instance is reachable in this dev environment, so this is
 * expected to fail with a real connection/auth error.
 */
@Injectable()
export class OracleApexAdapter implements IntegrationAdapter {
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
        `No ORDS path configured for action "${action}"`,
      );
    }

    const password =
      (await this.secretsProvider.getSecret(config.secretRef)) ?? "";
    const basicAuth = Buffer.from(`${config.username}:${password}`).toString(
      "base64",
    );

    const response = await fetch(
      `${config.baseUrl}/ords/${config.ordsSchema}${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(params),
      },
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new IntegrationCallError(
        response.status,
        `Oracle APEX/ORDS call failed: ${response.statusText}`,
      );
    }
    return { statusCode: response.status, body };
  }
}
