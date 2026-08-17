import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tenant } from "@/modules/tenants/entities/tenant.entity";

export type TagScope = "conversation" | "customer";

@Entity("tags")
export class Tag {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenant_id" })
  tenant: Tenant;

  @Column({ name: "tenant_id" })
  tenantId: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20, default: "#6B7280" })
  color: string;

  @Column({ length: 20, default: "conversation" })
  scope: TagScope;
}
