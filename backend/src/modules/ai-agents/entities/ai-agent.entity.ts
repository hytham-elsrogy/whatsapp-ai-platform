import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';

export interface GuardrailRules {
  forbidden_topics?: string[];
  force_escalation_keywords?: string[];
  escalation_department?: string;
  escalation_priority?: 'low' | 'normal' | 'high' | 'urgent';
}

@Entity('ai_agents')
export class AiAgent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column({ length: 100 })
  model: string;

  @Column({ type: 'float', default: 0.3 })
  temperature: number;

  @Column({ name: 'max_tokens', default: 800 })
  maxTokens: number;

  @Column({ name: 'confidence_threshold', type: 'float', default: 0.75 })
  confidenceThreshold: number;

  @Column({ name: 'allowed_departments', type: 'jsonb', default: [] })
  allowedDepartments: string[];

  @Column({ name: 'allowed_actions', type: 'jsonb', default: [] })
  allowedActions: string[];

  @Column({ name: 'escalation_rules', type: 'jsonb', default: {} })
  escalationRules: Record<string, unknown>;

  @Column({ name: 'guardrail_rules', type: 'jsonb', default: {} })
  guardrailRules: GuardrailRules;

  @Column({ length: 10, default: 'auto' })
  language: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
