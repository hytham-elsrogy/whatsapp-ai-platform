import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  phone: string;

  @Column({ nullable: true, length: 150 })
  name: string;

  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true, length: 100 })
  label: string;

  @Column({ nullable: true, length: 100 })
  company: string;

  @Column({ nullable: true, length: 50 })
  country: string;

  @Column({ nullable: true })
  lastContactAt: Date;

  @Column({ default: 0 })
  conversationCount: number;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'jsonb', nullable: true })
  customFields: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
