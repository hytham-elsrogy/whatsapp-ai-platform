import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "minio";

/**
 * Thin wrapper around the MinIO client — the only place in the codebase
 * that talks to object storage directly, same isolation principle as
 * MetaService for the Graph API. Attachment retrieval always goes through
 * `getPresignedUrl()`; the bucket itself is private, never public.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>(
      "minio.bucket",
      "whatsapp-media",
    );
    this.client = new Client({
      endPoint: this.configService.get<string>("minio.endpoint", "localhost"),
      port: this.configService.get<number>("minio.port", 9000),
      useSSL: this.configService.get<boolean>("minio.useSSL", false),
      accessKey: this.configService.get<string>("minio.accessKey", ""),
      secretKey: this.configService.get<string>("minio.secretKey", ""),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket "${this.bucket}"`);
      }
    } catch (error) {
      // Non-fatal at boot — MinIO being briefly unavailable shouldn't crash
      // the whole API; individual upload/download calls will surface their
      // own errors when actually used.
      this.logger.warn(
        `Could not verify/create MinIO bucket "${this.bucket}": ${(error as Error).message}`,
      );
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
  }

  /** Short-lived signed URL — the bucket is private, so this is the only way to actually retrieve an object. */
  async getPresignedUrl(key: string, expirySeconds = 300): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
