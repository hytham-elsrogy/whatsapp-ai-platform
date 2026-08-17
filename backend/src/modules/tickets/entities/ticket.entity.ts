import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '@/modules/tenants/entities/tenant.entity';
import { Customer } from '@/modules/customers/entities/customer.entity';

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'ticket_number', length: 30, unique: true })
  ticketNumber: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId?: string | null;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId?: string | null;

  @Column({ length: 10, default: 'normal' })
  priority: TicketPriority;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string | null;

  @Column({ length: 20, default: 'open' })
  status: TicketStatus;

  @Column({ name: 'sla_policy_id', type: 'uuid', nullable: true })
  slaPolicyId?: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution?: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
