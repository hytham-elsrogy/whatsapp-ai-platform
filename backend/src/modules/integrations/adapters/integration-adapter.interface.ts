import { IntegrationConfig } from "../entities/integration.entity";

export interface AdapterCallResult {
  statusCode: number;
  body: unknown;
}

export class IntegrationCallError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export interface IntegrationAdapter {
  /** Resolves the real secret behind config.secretRef via SECRETS_PROVIDER (see modules/secrets) and makes the real external call. */
  execute(
    config: IntegrationConfig,
    action: string,
    params: Record<string, unknown>,
  ): Promise<AdapterCallResult>;
}
