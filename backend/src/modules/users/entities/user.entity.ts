import * as argon2 from 'argon2';
import { Exclude } from 'class-transformer';
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
import { Role } from '@/modules/roles-permissions/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150 })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 20, default: 'active' })
  status: 'active' | 'disabled';

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Exclude()
  @Column({ name: 'mfa_secret', length: 255, nullable: true })
  mfaSecret?: string;

  @Column({ length: 10, default: 'ar' })
  language: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  static async hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain);
  }

  validatePassword(plain: string): Promise<boolean> {
    return argon2.verify(this.passwordHash, plain);
  }
}
