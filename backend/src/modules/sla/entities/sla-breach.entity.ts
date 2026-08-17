import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export type SlaBreachType = "first_response" | "resolution";

@Entity("sla_breaches")
export class SlaBreach {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "ticket_id", type: "uuid", nullable: true })
  ticketId?: string | null;

  @Column({ name: "conversation_id", type: "uuid", nullable: true })
  conversationId?: string | null;

  @Column({ name: "policy_id" })
  policyId: string;

  @Column({ length: 20 })
  type: SlaBreachType;

  @CreateDateColumn({ name: "breached_at" })
  breachedAt: Date;
}
