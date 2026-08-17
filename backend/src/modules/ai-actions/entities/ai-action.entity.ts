import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type AiActionStatus = 'pending' | 'success' | 'failed' | 'rejected';

@Entity('ai_actions')
export class AiAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ai_session_id' })
  aiSessionId: string;

  @Column({ name: 'action_name', length: 100 })
  actionName: string;

  @Column({ type: 'jsonb', default: {} })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output?: Record<string, unknown>;

  @Column({ length: 20, default: 'pending' })
  status: AiActionStatus;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt: Date;
}
