import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, default: 'string' })
  type: string;

  @Column({ nullable: true, length: 100 })
  group: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
