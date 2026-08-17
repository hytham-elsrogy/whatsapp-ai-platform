import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { KnowledgeBase } from './knowledge-base.entity';

export type DocumentSourceType = 'faq' | 'policy' | 'pdf' | 'url' | 'manual';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

@Entity('documents')
export class KbDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KnowledgeBase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'knowledge_base_id' })
  knowledgeBase: KnowledgeBase;

  @Column({ name: 'knowledge_base_id' })
  knowledgeBaseId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'source_type', length: 30 })
  sourceType: DocumentSourceType;

  @Column({ name: 'source_uri', length: 500, nullable: true })
  sourceUri?: string;

  @Column({ length: 20, default: 'processing' })
  status: DocumentStatus;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
