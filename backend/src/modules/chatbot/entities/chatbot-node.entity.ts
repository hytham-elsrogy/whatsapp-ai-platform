import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ChatbotFlow } from "./chatbot-flow.entity";

export type ChatbotNodeType =
  | "start"
  | "message"
  | "question"
  | "button"
  | "list"
  | "condition"
  | "department"
  | "agent"
  | "ai"
  | "api_call"
  | "db_query"
  | "delay"
  | "tag"
  | "end";

@Entity("chatbot_nodes")
export class ChatbotNode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ChatbotFlow, { onDelete: "CASCADE" })
  @JoinColumn({ name: "flow_id" })
  flow: ChatbotFlow;

  @Column({ name: "flow_id" })
  flowId: string;

  @Column({ length: 30 })
  type: ChatbotNodeType;

  @Column({ type: "jsonb", default: {} })
  config: Record<string, unknown>;

  @Column({ name: "position_x", type: "float", default: 0 })
  positionX: number;

  @Column({ name: "position_y", type: "float", default: 0 })
  positionY: number;
}
