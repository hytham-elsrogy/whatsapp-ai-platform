import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tenant } from "@/modules/tenants/entities/tenant.entity";

export type TemplateCategory = "utility" | "marketing" | "authentication";
export type TemplateStatus = "pending" | "approved" | "rejected";

@Entity("templates")
export class Template {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 30 })
  category: TemplateCategory;

  @Column({ length: 10 })
  language: string;

  @Column({ type: "text" })
  body: string;

  @Column({
    name: "meta_template_id",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  metaTemplateId?: string | null;

  @Column({ length: 20, default: "pending" })
  status: TemplateStatus;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
