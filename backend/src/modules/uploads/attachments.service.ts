import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MetaApiError, MetaService } from "@/modules/meta/meta.service";
import { StorageService } from "./storage.service";
import { Attachment } from "./entities/attachment.entity";

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
    private readonly metaService: MetaService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Downloads an inbound media message from Meta and stores it in MinIO.
   * Non-fatal by design: a failure here (e.g. no real Meta credentials in
   * dev, or the media already expired) must never break inbound webhook
   * processing — the message itself is already persisted with its raw
   * Meta JSON regardless of whether this succeeds. Returns null on failure.
   */
  async downloadAndStore(
    tenantId: string,
    messageId: string,
    mediaId: string,
    accessToken: string,
    caption?: string,
  ): Promise<Attachment | null> {
    try {
      const { url, mimeType, fileSize } = await this.metaService.getMediaUrl(
        mediaId,
        accessToken,
      );
      const { buffer, contentType } = await this.metaService.downloadMedia(
        url,
        accessToken,
      );

      const storageKey = `${tenantId}/${messageId}/${mediaId}`;
      await this.storageService.upload(
        storageKey,
        buffer,
        mimeType || contentType,
      );

      return this.repo.save(
        this.repo.create({
          messageId,
          storageKey,
          mimeType: mimeType || contentType,
          size: fileSize || buffer.length,
          caption,
        }),
      );
    } catch (error) {
      if (error instanceof MetaApiError) {
        this.logger.warn(
          `Media download failed for message ${messageId} (non-fatal): ${error.message}`,
        );
        return null;
      }
      throw error;
    }
  }

  findByMessage(messageId: string): Promise<Attachment[]> {
    return this.repo.find({ where: { messageId } });
  }

  async getPresignedUrl(id: string): Promise<string> {
    const attachment = await this.repo.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException("Attachment not found");
    return this.storageService.getPresignedUrl(attachment.storageKey);
  }
}
