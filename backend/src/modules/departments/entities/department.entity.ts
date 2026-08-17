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
import { User } from "@/modules/users/entities/user.entity";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "supervisor_id" })
  supervisor?: User;

  @Column({ name: "supervisor_id", nullable: true })
  supervisorId?: string;

  @Column({ name: "working_hours", type: "jsonb", nullable: true })
  workingHours?: Record<string, string[]>;

  @Column({ name: "knowledge_base_id", type: "uuid", nullable: true })
  knowledgeBaseId?: string | null;

  @Column({ name: "ai_agent_id", type: "uuid", nullable: true })
  aiAgentId?: string | null;

  @Column({ name: "ai_reply_mode", length: 20, default: "suggestion" })
  aiReplyMode: "auto" | "suggestion" | "human_only";

  @Column({ name: "routing_strategy", length: 20, default: "round_robin" })
  routingStrategy:
    | "round_robin"
    | "least_active"
    | "department_based"
    | "manual"
    | "skill_based";

  @Column({ name: "last_assigned_index", default: 0 })
  lastAssignedIndex: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
