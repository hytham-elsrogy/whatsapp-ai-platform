import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tenant } from "@/modules/tenants/entities/tenant.entity";
import { Department } from "@/modules/departments/entities/department.entity";

@Entity("whatsapp_numbers")
export class WhatsappNumber {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ name: "phone_number_id", length: 50, unique: true })
  phoneNumberId: string;

  @Column({ name: "waba_id", length: 50 })
  wabaId: string;

  @Column({ name: "display_number", length: 30 })
  displayNumber: string;

  @Column({ length: 100 })
  label: string;

  @Column({ name: "access_token_secret_ref", length: 255 })
  accessTokenSecretRef: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: "department_id" })
  department?: Department;

  @Column({ name: "department_id", nullable: true })
  departmentId?: string;

  @Column({ name: "chatbot_flow_id", nullable: true })
  chatbotFlowId?: string;

  @Column({ name: "ai_agent_id", nullable: true })
  aiAgentId?: string;

  @Column({ length: 20, default: "active" })
  status: "active" | "inactive";

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
