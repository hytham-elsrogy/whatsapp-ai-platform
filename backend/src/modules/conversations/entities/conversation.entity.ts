import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Tenant } from "@/modules/tenants/entities/tenant.entity";
import { Customer } from "@/modules/customers/entities/customer.entity";
import { Department } from "@/modules/departments/entities/department.entity";
import { User } from "@/modules/users/entities/user.entity";
import { WhatsappNumber } from "@/modules/whatsapp-numbers/entities/whatsapp-number.entity";

export type ConversationStatus =
  | "new"
  | "bot"
  | "ai"
  | "waiting"
  | "assigned"
  | "in_progress"
  | "pending_customer"
  | "escalated"
  | "resolved"
  | "closed";

const OPEN_STATUSES: ConversationStatus[] = [
  "new",
  "bot",
  "ai",
  "waiting",
  "assigned",
  "in_progress",
  "pending_customer",
  "escalated",
];

export const CLOSED_STATUSES: ConversationStatus[] = ["resolved", "closed"];

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  @Column({ name: "customer_id" })
  customerId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: "department_id" })
  department?: Department;

  @Column({ name: "department_id", nullable: true })
  departmentId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "assigned_agent_id" })
  assignedAgent?: User;

  @Column({ name: "assigned_agent_id", nullable: true })
  assignedAgentId?: string;

  @ManyToOne(() => WhatsappNumber)
  @JoinColumn({ name: "whatsapp_number_id" })
  whatsappNumber: WhatsappNumber;

  @Column({ name: "whatsapp_number_id" })
  whatsappNumberId: string;

  @Column({ length: 20, default: "new" })
  status: ConversationStatus;

  @Column({ length: 10, default: "normal" })
  priority: "low" | "normal" | "high" | "urgent";

  @Column({ name: "ai_agent_id", type: "uuid", nullable: true })
  aiAgentId?: string | null;

  @Column({ name: "ai_mode", length: 20, nullable: true })
  aiMode?: string;

  @Column({
    name: "last_customer_message_at",
    type: "timestamptz",
    nullable: true,
  })
  lastCustomerMessageAt?: Date;

  @Column({ name: "first_response_at", type: "timestamptz", nullable: true })
  firstResponseAt?: Date;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt?: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt?: Date;

  @Column({ name: "csat_rating", type: "smallint", nullable: true })
  csatRating?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  static isOpenStatus(status: ConversationStatus): boolean {
    return OPEN_STATUSES.includes(status);
  }
}
