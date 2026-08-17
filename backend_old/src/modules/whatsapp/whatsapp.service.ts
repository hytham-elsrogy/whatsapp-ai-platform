import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import { MessageType } from '../../common/enums';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly client: AxiosInstance;
  private readonly phoneNumberId: string;

  constructor(private readonly configService: ConfigService) {
    const apiUrl = configService.get<string>('whatsapp.apiUrl');
    const accessToken = configService.get<string>('whatsapp.accessToken');
    this.phoneNumberId = configService.get<string>('whatsapp.phoneNumberId');

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(params: {
    to: string;
    type: MessageType;
    content?: string;
    mediaUrl?: string;
    caption?: string;
    replyToId?: string;
    metadata?: any;
  }) {
    const { to, type, content, mediaUrl, caption, replyToId, metadata } = params;
    const phone = to.replace(/\D/g, '');

    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
    };

    if (replyToId) {
      body.context = { message_id: replyToId };
    }

    switch (type) {
      case MessageType.TEXT:
        body.type = 'text';
        body.text = { body: content, preview_url: true };
        break;

      case MessageType.IMAGE:
        body.type = 'image';
        body.image = mediaUrl
          ? { link: mediaUrl, caption }
          : { id: metadata?.mediaId, caption };
        break;

      case MessageType.AUDIO:
        body.type = 'audio';
        body.audio = mediaUrl ? { link: mediaUrl } : { id: metadata?.mediaId };
        break;

      case MessageType.VIDEO:
        body.type = 'video';
        body.video = mediaUrl ? { link: mediaUrl, caption } : { id: metadata?.mediaId, caption };
        break;

      case MessageType.DOCUMENT:
        body.type = 'document';
        body.document = mediaUrl
          ? { link: mediaUrl, filename: metadata?.fileName, caption }
          : { id: metadata?.mediaId, filename: metadata?.fileName, caption };
        break;

      case MessageType.LOCATION:
        body.type = 'location';
        body.location = {
          latitude: metadata?.latitude,
          longitude: metadata?.longitude,
          name: metadata?.locationName,
          address: metadata?.address,
        };
        break;

      case MessageType.INTERACTIVE:
        body.type = 'interactive';
        body.interactive = metadata?.interactive;
        break;

      case MessageType.TEMPLATE:
        body.type = 'template';
        body.template = {
          name: metadata?.templateName,
          language: { code: metadata?.language || 'ar' },
          components: metadata?.components || [],
        };
        break;

      default:
        throw new BadRequestException(`نوع الرسالة غير مدعوم: ${type}`);
    }

    try {
      const response = await this.client.post(`/${this.phoneNumberId}/messages`, body);
      this.logger.log(`Message sent to ${phone}, ID: ${response.data?.messages?.[0]?.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error?.response?.data?.error?.message || error.message}`);
      throw error;
    }
  }

  async uploadMedia(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', buffer, { filename: fileName, contentType: mimeType });
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const response = await this.client.post(`/${this.phoneNumberId}/media`, formData, {
      headers: formData.getHeaders(),
    });

    return response.data.id;
  }

  async getMediaUrl(mediaId: string): Promise<string> {
    const response = await this.client.get(`/${mediaId}`);
    return response.data.url;
  }

  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${this.configService.get('whatsapp.accessToken')}` },
    });
    return Buffer.from(response.data);
  }

  async markMessageRead(messageId: string): Promise<void> {
    await this.client.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  async getTemplates(): Promise<any> {
    const businessAccountId = this.configService.get('whatsapp.businessAccountId');
    const response = await this.client.get(`/${businessAccountId}/message_templates`);
    return response.data;
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('whatsapp.webhookVerifyToken');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  parseWebhookPayload(body: any) {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) return null;

    const messages = value?.messages || [];
    const statuses = value?.statuses || [];
    const contacts = value?.contacts || [];

    return { messages, statuses, contacts, metadata: value?.metadata };
  }
}
