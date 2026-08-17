export interface KnowledgeBase {
  id: string;
  name: string;
  departmentId?: string | null;
  createdAt: string;
}

export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface KbDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  sourceType: 'faq' | 'policy' | 'pdf' | 'url' | 'manual';
  status: DocumentStatus;
  createdAt: string;
}

export interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
}

export interface DocumentWithChunks extends KbDocument {
  chunks: DocumentChunk[];
}
