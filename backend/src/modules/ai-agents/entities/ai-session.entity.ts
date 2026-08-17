import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type AiSessionStatus = 'active' | 'escalated' | 'resolved';

@Entity('ai_sessions')
export class AiSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({ name: 'ai_agent_id' })
  aiAgentId: string;

  @Column({ nullable: true })
  intent?: string;

  @Column({ type: 'float', nullable: true })
  confidence?: number;

  @Column({ length: 20, default: 'active' })
  status: AiSessionStatus;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;
}
