import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ChatbotFlow } from './chatbot-flow.entity';
import { ChatbotNode } from './chatbot-node.entity';

@Entity('chatbot_edges')
export class ChatbotEdge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ChatbotFlow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flow_id' })
  flow: ChatbotFlow;

  @Column({ name: 'flow_id' })
  flowId: string;

  @ManyToOne(() => ChatbotNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_node_id' })
  sourceNode: ChatbotNode;

  @Column({ name: 'source_node_id' })
  sourceNodeId: string;

  @ManyToOne(() => ChatbotNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_node_id' })
  targetNode: ChatbotNode;

  @Column({ name: 'target_node_id' })
  targetNodeId: string;

  /** e.g. { equals: "1" } for condition/button/list branching; null = default/only edge */
  @Column({ type: 'jsonb', nullable: true })
  condition?: Record<string, unknown>;
}
