import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Customer } from '@/modules/customers/entities/customer.entity';
import { Tag } from './tag.entity';

@Entity('customer_tags')
export class CustomerTag {
  @PrimaryColumn({ name: 'customer_id' })
  customerId: string;

  @PrimaryColumn({ name: 'tag_id' })
  tagId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
