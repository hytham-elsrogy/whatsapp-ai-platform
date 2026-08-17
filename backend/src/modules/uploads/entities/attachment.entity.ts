import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Message } from '@/modules/messages/entities/message.entity';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id' })
  messageId: string;

  /** MinIO/S3 object key — never a public URL; retrieval always goes through StorageService.getPresignedUrl(). */
  @Column({ name: 'storage_key', length: 500 })
  storageKey: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string | null;

  // bigint columns come back from pg as strings by default (to avoid JS
  // number precision loss on huge values) — a transformer keeps this a
  // real `number` on the TS side, since file sizes never approach that limit.
  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value?: number | null) => value,
      from: (value: string | null) => (value === null ? null : parseInt(value, 10)),
    },
  })
  size?: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption?: string | null;
}
