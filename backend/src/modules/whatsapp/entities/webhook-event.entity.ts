import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30, default: 'meta' })
  source: string;

  @Column({ name: 'event_id', length: 150 })
  eventId: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ default: false })
  processed: boolean;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;
}
