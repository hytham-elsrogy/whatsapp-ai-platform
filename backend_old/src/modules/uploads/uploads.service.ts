import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = configService.get<string>('minio.bucket');

    this.minioClient = new Minio.Client({
      endPoint: configService.get<string>('minio.endpoint'),
      port: configService.get<number>('minio.port'),
      useSSL: configService.get<boolean>('minio.useSsl'),
      accessKey: configService.get<string>('minio.accessKey'),
      secretKey: configService.get<string>('minio.secretKey'),
    });

    this.initBucket();
  }

  private async initBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          }],
        });
        await this.minioClient.setBucketPolicy(this.bucket, policy);
        this.logger.log(`Bucket '${this.bucket}' created`);
      }
    } catch (error) {
      this.logger.warn(`MinIO init failed: ${error.message}`);
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{
    url: string; key: string; originalName: string; mimeType: string; size: number;
  }> {
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const MAX_SIZE = 25 * 1024 * 1024;

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`نوع الملف غير مدعوم: ${file.mimetype}`);
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException('حجم الملف يتجاوز الحد المسموح (25MB)');
    }

    const ext = path.extname(file.originalname);
    const key = `uploads/${uuidv4()}${ext}`;

    await this.minioClient.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
      'Content-Disposition': `inline; filename="${file.originalname}"`,
    });

    const endpoint = this.configService.get<string>('minio.endpoint');
    const port = this.configService.get<number>('minio.port');
    const useSSL = this.configService.get<boolean>('minio.useSsl');
    const protocol = useSSL ? 'https' : 'http';
    const url = `${protocol}://${endpoint}:${port}/${this.bucket}/${key}`;

    return {
      url,
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucket, key);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${key}: ${error.message}`);
    }
  }

  async getPresignedUrl(key: string, expiry = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(this.bucket, key, expiry);
  }
}
