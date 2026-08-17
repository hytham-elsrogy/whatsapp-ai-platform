import { IntegrationConfig } from '../entities/integration.entity';

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
  /** Resolves the real secret behind config.secretRef (currently: process.env lookup — see MetaService.resolveAccessToken for the same still-open Secret Manager TODO) and makes the real external call. */
  execute(config: IntegrationConfig, action: string, params: Record<string, unknown>): Promise<AdapterCallResult>;
}

export function resolveSecret(secretRef: string | undefined): string {
  if (!secretRef) return '';
  return process.env[secretRef] ?? '';
}
