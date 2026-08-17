import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';

export type IntegrationType = 'odoo' | 'oracle_apex' | 'his' | 'custom';
export type IntegrationStatus = 'active' | 'inactive';

export interface IntegrationConfig {
  baseUrl: string;
  // Only a reference to where the real secret lives (Secret Manager/env var
  // name) — never the raw credential. See the security architecture doc's
  // secret-handling rules, already followed by whatsapp_numbers.access_token_secret_ref.
  secretRef?: string;
  database?: string; // Odoo
  username?: string; // Odoo / Oracle APEX basic auth
  ordsSchema?: string; // Oracle APEX
  endpoints?: Record<string, string>; // actionName -> path, used by GenericHttpAdapter
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 30 })
  type: IntegrationType;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'jsonb', default: {} })
  config: IntegrationConfig;

  @Column({ length: 20, default: 'inactive' })
  status: IntegrationStatus;
}
