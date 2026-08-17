import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Department } from '@/modules/departments/entities/department.entity';
import { User } from '@/modules/users/entities/user.entity';

export type ChatbotFlowStatus = 'draft' | 'published' | 'archived';

@Entity('chatbot_flows')
export class ChatbotFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ name: 'department_id', nullable: true })
  departmentId?: string;

  @Column({ default: 1 })
  version: number;

  @Column({ length: 20, default: 'draft' })
  status: ChatbotFlowStatus;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;

  @Column({ name: 'created_by', nullable: true })
  createdById?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
