import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Message, MessageStatusValue } from "./message.entity";

@Entity("message_statuses")
export class MessageStatusEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Message, { onDelete: "CASCADE" })
  @JoinColumn({ name: "message_id" })
  message: Message;

  @Column({ name: "message_id" })
  messageId: string;

  @Column({ length: 20 })
  status: MessageStatusValue;

  @Column({ name: "occurred_at", type: "timestamptz" })
  occurredAt: Date;

  @Column({ name: "raw_payload", type: "jsonb", nullable: true })
  rawPayload?: Record<string, unknown>;
}
