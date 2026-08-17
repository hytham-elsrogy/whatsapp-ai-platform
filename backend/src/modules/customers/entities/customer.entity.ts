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

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ name: "whatsapp_number", length: 30 })
  whatsappNumber: string;

  @Column({ length: 150, nullable: true })
  name?: string;

  @Column({ length: 10, default: "ar" })
  language: string;

  @Column({ name: "patient_id", length: 50, nullable: true })
  patientId?: string;

  @Column({ name: "avatar_url", length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ name: "last_interaction_at", type: "timestamptz", nullable: true })
  lastInteractionAt?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
