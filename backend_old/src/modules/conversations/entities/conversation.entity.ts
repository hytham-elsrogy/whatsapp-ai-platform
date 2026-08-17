import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { ConversationStatus } from '../../../common/enums';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Contact, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact;

  @Column({ name: 'contact_id' })
  contactId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id', nullable: true })
  departmentId: string;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.NEW })
  status: ConversationStatus;

  @Column({ default: false })
  starred: boolean;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'text', nullable: true })
  lastMessageContent: string;

  @Column({ default: 0 })
  unreadCount: number;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ nullable: true })
  firstResponseAt: Date;

  @Column({ nullable: true, type: 'float' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  ratingComment: string;

  @Column({ nullable: true })
  ratedAt: Date;

  @Column({ nullable: true, length: 50 })
  customStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
