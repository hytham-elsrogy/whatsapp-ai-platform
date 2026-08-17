import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Template } from './template.entity';

@Entity('template_variables')
export class TemplateVariable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Template, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: Template;

  @Column({ name: 'template_id' })
  templateId: string;

  @Column()
  position: number;

  @Column({ name: 'example_value', type: 'varchar', length: 255, nullable: true })
  exampleValue?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;
}
