import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmbeddingProvider } from "@/modules/llm/interfaces/llm-provider.interface";
import { EMBEDDING_PROVIDER } from "@/modules/llm/llm.tokens";
import { KbDocument } from "./entities/kb-document.entity";
import { DocumentChunk } from "./entities/document-chunk.entity";
import { KnowledgeBaseService } from "./knowledge-base.service";
import { EmbeddingsRepository } from "./embeddings.repository";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { chunkText, estimateTokenCount } from "./chunking.util";
import { extractTextFromHtml } from "./html-extractor.util";
import { extractTextFromPdf } from "./pdf-extractor.util";
import { assertPublicUrl } from "./url-safety.util";

export interface DocumentWithChunks extends KbDocument {
  chunks: DocumentChunk[];
}

const MAX_URL_FETCH_BYTES = 10 * 1024 * 1024; // 10MB — a runaway page shouldn't hang ingestion

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(KbDocument)
    private readonly documentRepo: Repository<KbDocument>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepo: Repository<DocumentChunk>,
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly embeddingsRepository: EmbeddingsRepository,
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: EmbeddingProvider,
  ) {}

  findAllForKnowledgeBase(knowledgeBaseId: string): Promise<KbDocument[]> {
    return this.documentRepo.find({
      where: { knowledgeBaseId },
      order: { createdAt: "DESC" },
    });
  }

  async findOneWithChunks(
    tenantId: string,
    id: string,
  ): Promise<DocumentWithChunks> {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException("Document not found");
    await this.knowledgeBaseService.findOne(tenantId, document.knowledgeBaseId); // tenant-scope check
    const chunks = await this.chunkRepo.find({
      where: { documentId: id },
      order: { chunkIndex: "ASC" },
    });
    return { ...document, chunks };
  }

  /** manual/faq/policy (pasted text) or url (fetched + HTML-stripped server-side). */
  async create(
    tenantId: string,
    knowledgeBaseId: string,
    userId: string,
    dto: CreateDocumentDto,
  ) {
    await this.knowledgeBaseService.findOne(tenantId, knowledgeBaseId); // tenant-scope check

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        knowledgeBaseId,
        title: dto.title,
        sourceType: dto.sourceType,
        sourceUri: dto.sourceUri,
        status: "processing",
        uploadedBy: userId,
      }),
    );

    if (dto.sourceType !== "url") {
      return this.ingest(document, dto.content!);
    }

    // Fetching the URL is a separate failure mode from embedding/chunking,
    // but the document row already exists either way — same "mark failed,
    // don't 500 the request" rule applies here too.
    let rawText: string;
    try {
      rawText = await this.fetchAndExtractUrl(dto.sourceUri!);
    } catch (error) {
      this.logger.warn(
        `URL fetch failed for document ${document.id}: ${(error as Error).message}`,
      );
      await this.documentRepo.update(document.id, { status: "failed" });
      return { ...document, status: "failed" as const };
    }
    return this.ingest(document, rawText);
  }

  async createFromPdf(
    tenantId: string,
    knowledgeBaseId: string,
    userId: string,
    title: string,
    fileBuffer: Buffer,
  ) {
    await this.knowledgeBaseService.findOne(tenantId, knowledgeBaseId); // tenant-scope check

    const document = await this.documentRepo.save(
      this.documentRepo.create({
        knowledgeBaseId,
        title,
        sourceType: "pdf",
        status: "processing",
        uploadedBy: userId,
      }),
    );

    let rawText: string;
    try {
      rawText = await extractTextFromPdf(fileBuffer);
    } catch (error) {
      this.logger.warn(
        `PDF text extraction failed for document ${document.id}: ${(error as Error).message}`,
      );
      await this.documentRepo.update(document.id, { status: "failed" });
      return { ...document, status: "failed" as const };
    }
    return this.ingest(document, rawText);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) throw new NotFoundException("Document not found");
    await this.knowledgeBaseService.findOne(tenantId, document.knowledgeBaseId); // tenant-scope check
    await this.embeddingsRepository.deleteByDocumentId(id);
    await this.documentRepo.delete(id); // cascades to document_chunks
  }

  /** Chunking + embedding run inline (no job queue for this yet); on failure the document is saved as status=failed rather than the request 500ing, since the document resource itself was already created. */
  private async ingest(document: KbDocument, rawText: string) {
    try {
      const pieces = chunkText(rawText);
      if (pieces.length === 0) {
        throw new Error("Document content produced no chunks");
      }

      const vectors = await this.embeddingProvider.embed(pieces);

      const chunks = await this.chunkRepo.save(
        pieces.map((content, index) =>
          this.chunkRepo.create({
            documentId: document.id,
            chunkIndex: index,
            content,
            tokenCount: estimateTokenCount(content),
          }),
        ),
      );

      for (let i = 0; i < chunks.length; i++) {
        await this.embeddingsRepository.insert(
          chunks[i].id,
          vectors[i],
          this.embeddingProvider.modelName,
        );
      }

      await this.documentRepo.update(document.id, { status: "ready" });
      return { ...document, status: "ready" as const };
    } catch (error) {
      this.logger.warn(
        `Document ${document.id} ingestion failed: ${(error as Error).message}`,
      );
      await this.documentRepo.update(document.id, { status: "failed" });
      return { ...document, status: "failed" as const };
    }
  }

  private async fetchAndExtractUrl(url: string): Promise<string> {
    // SSRF guard: a URL that resolves to a public address on first check
    // could still redirect to an internal one (169.254.169.254, an
    // internal MinIO/Postgres port, another container on this network) —
    // so redirects are followed manually, one hop at a time, re-validating
    // every target before the server ever connects to it.
    const MAX_REDIRECTS = 5;
    let currentUrl = url;
    let response: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (hop === MAX_REDIRECTS) {
        throw new BadRequestException("Too many redirects");
      }

      try {
        await assertPublicUrl(currentUrl);
      } catch (error) {
        throw new BadRequestException(
          `Refusing to fetch that URL: ${(error as Error).message}`,
        );
      }

      try {
        response = await fetch(currentUrl, { redirect: "manual" });
      } catch (error) {
        throw new BadRequestException(
          `Could not reach URL: ${(error as Error).message}`,
        );
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new BadRequestException("Redirect with no Location header");
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break;
    }
    if (!response) {
      throw new BadRequestException("Too many redirects");
    }

    if (!response.ok) {
      throw new BadRequestException(
        `URL returned ${response.status} ${response.statusText}`,
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_URL_FETCH_BYTES) {
      throw new BadRequestException(
        `Page too large (${contentLength} bytes) to ingest`,
      );
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);
    if (!text)
      throw new BadRequestException("No readable text found at that URL");
    return text;
  }
}
