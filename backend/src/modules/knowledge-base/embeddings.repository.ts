import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  distance: number;
}

/**
 * pgvector's `vector` column type isn't natively supported by TypeORM's
 * entity/repository layer, so the embeddings table is managed here via raw
 * parameterized SQL rather than a TypeORM entity — same rationale as the
 * hand-written migration SQL.
 */
@Injectable()
export class EmbeddingsRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async insert(
    chunkId: string,
    vector: number[],
    model: string,
  ): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO embeddings (chunk_id, vector, model) VALUES ($1, $2::vector, $3)
       ON CONFLICT (chunk_id) DO UPDATE SET vector = $2::vector, model = $3`,
      [chunkId, this.toVectorLiteral(vector), model],
    );
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM embeddings WHERE chunk_id IN (SELECT id FROM document_chunks WHERE document_id = $1)`,
      [documentId],
    );
  }

  async searchByKnowledgeBase(
    knowledgeBaseId: string,
    queryVector: number[],
    topK: number,
  ): Promise<RetrievedChunk[]> {
    const rows = await this.dataSource.query(
      `SELECT dc.id AS "chunkId", dc.document_id AS "documentId", d.title AS "documentTitle",
              dc.content, (e.vector <=> $1::vector) AS distance
       FROM embeddings e
       JOIN document_chunks dc ON dc.id = e.chunk_id
       JOIN documents d ON d.id = dc.document_id
       WHERE d.knowledge_base_id = $2 AND d.status = 'ready'
       ORDER BY e.vector <=> $1::vector
       LIMIT $3`,
      [this.toVectorLiteral(queryVector), knowledgeBaseId, topK],
    );
    return rows as RetrievedChunk[];
  }

  private toVectorLiteral(vector: number[]): string {
    return `[${vector.join(",")}]`;
  }
}
