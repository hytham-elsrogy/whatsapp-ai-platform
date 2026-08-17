import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type AiMessageRole = "user" | "assistant" | "system" | "tool";

@Entity("ai_messages")
export class AiMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ai_session_id" })
  aiSessionId: string;

  @Column({ length: 20 })
  role: AiMessageRole;

  @Column({ type: "text" })
  content: string;

  @Column({ name: "tokens_used", nullable: true })
  tokensUsed?: number;

  @Column({ name: "source_refs", type: "jsonb", nullable: true })
  sourceRefs?: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
