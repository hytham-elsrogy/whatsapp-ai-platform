import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 80, unique: true })
  slug: string;

  @Column({ length: 20, default: "active" })
  status: "active" | "suspended";

  @Column({ length: 40, default: "standard" })
  plan: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
