import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tenant } from "@/modules/tenants/entities/tenant.entity";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";

export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "customer" | "agent" | "ai" | "system" | "bot";
export type MessageType =
  | "text"
  | "image"
  | "document"
  | "audio"
  | "video"
  | "location"
  | "contact"
  | "interactive"
  | "template";
export type MessageStatusValue =
  "pending" | "sent" | "delivered" | "read" | "failed";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @Column({ name: "conversation_id" })
  conversationId: string;

  @Column({ length: 10 })
  direction: MessageDirection;

  @Column({ name: "sender_type", length: 20 })
  senderType: MessageSenderType;

  @Column({ name: "sender_id", nullable: true })
  senderId?: string;

  @Column({ name: "wa_message_id", length: 100, unique: true, nullable: true })
  waMessageId?: string;

  @Column({ length: 20 })
  type: MessageType;

  @Column({ type: "jsonb" })
  content: Record<string, unknown>;

  @Column({ length: 20, default: "sent" })
  status: MessageStatusValue;

  @CreateDateColumn({ name: "sent_at" })
  sentAt: Date;
}
