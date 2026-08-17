import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { KbDocument } from './kb-document.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KbDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: KbDocument;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'token_count', nullable: true })
  tokenCount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
