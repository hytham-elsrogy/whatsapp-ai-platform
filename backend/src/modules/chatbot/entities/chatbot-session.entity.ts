import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { ChatbotFlow } from "./chatbot-flow.entity";
import { ChatbotNode } from "./chatbot-node.entity";

@Entity("chatbot_sessions")
export class ChatbotSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Conversation;

  @Column({ name: "conversation_id" })
  conversationId: string;

  @ManyToOne(() => ChatbotFlow)
  @JoinColumn({ name: "flow_id" })
  flow: ChatbotFlow;

  @Column({ name: "flow_id" })
  flowId: string;

  @ManyToOne(() => ChatbotNode, { nullable: true })
  @JoinColumn({ name: "current_node_id" })
  currentNode?: ChatbotNode;

  @Column({ name: "current_node_id", nullable: true, type: "uuid" })
  currentNodeId?: string | null;

  @Column({ type: "jsonb", default: {} })
  variables: Record<string, unknown>;

  @CreateDateColumn({ name: "started_at" })
  startedAt: Date;

  @Column({ name: "ended_at", type: "timestamptz", nullable: true })
  endedAt?: Date;
}
