import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("api_logs")
export class ApiLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "tenant_id", type: "uuid", nullable: true })
  tenantId?: string | null;

  @Column({ name: "integration_id", type: "uuid", nullable: true })
  integrationId?: string | null;

  @Column({ length: 255 })
  endpoint: string;

  @Column({ length: 10 })
  method: string;

  @Column({ name: "status_code", type: "int", nullable: true })
  statusCode?: number | null;

  @Column({ name: "duration_ms", type: "int", nullable: true })
  durationMs?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
