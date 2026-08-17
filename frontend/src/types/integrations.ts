export type IntegrationType = 'odoo' | 'oracle_apex' | 'his' | 'custom';
export type IntegrationStatus = 'active' | 'inactive';

export interface IntegrationConfig {
  baseUrl: string;
  secretRef?: string;
  database?: string;
  username?: string;
  ordsSchema?: string;
  endpoints?: Record<string, string>;
}

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  config: IntegrationConfig;
  status: IntegrationStatus;
}

export interface TestConnectionResult {
  ok: boolean;
  body?: unknown;
  error?: string;
}
