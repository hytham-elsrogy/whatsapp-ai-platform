import { createHmac, timingSafeEqual, createHash } from 'crypto';
import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { WebhookEvent } from './entities/webhook-event.entity';
import { WHATSAPP_INBOUND_QUEUE } from '@/queue/queue.module';

@ApiExcludeController()
@Controller('webhooks/whatsapp')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(WHATSAPP_INBOUND_QUEUE) private readonly inboundQueue: Queue,
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepo: Repository<WebhookEvent>,
  ) {}

  @Public()
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expected = this.configService.get<string>('meta.verifyToken', '');
    if (mode === 'subscribe' && expected && verifyToken === expected) {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).send('Verification failed');
  }

  @Public()
  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ) {
    this.verifySignature(req.rawBody, signature);

    // Meta's webhook body carries no stable top-level event id; hashing the
    // raw payload gives us an idempotency key for exact-duplicate retries
    // (the documented Meta retry behavior). Per-message duplicates across
    // non-identical deliveries are separately guarded by the unique
    // wa_message_id constraint in MessagesService.create.
    const eventId = createHash('sha256').update(req.rawBody ?? Buffer.from('')).digest('hex');

    try {
      await this.webhookEventRepo.insert({ source: 'meta', eventId, payload: req.body });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        this.logger.log(`Duplicate webhook delivery ignored (event_id=${eventId})`);
        return { status: 'duplicate' };
      }
      throw error;
    }

    await this.inboundQueue.add('inbound-event', req.body, {
      jobId: eventId,
    });

    return { status: 'accepted' };
  }

  private verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): void {
    const appSecret = this.configService.get<string>('meta.appSecret', '');
    if (!appSecret) {
      this.logger.warn('META_APP_SECRET not configured — skipping webhook signature verification (dev only)');
      return;
    }
    if (!rawBody || !signatureHeader?.startsWith('sha256=')) {
      throw new BadRequestException('Missing webhook signature');
    }

    const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const provided = signatureHeader.slice('sha256='.length);

    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(provided, 'hex');
    if (
      expectedBuf.length !== providedBuf.length ||
      !timingSafeEqual(expectedBuf, providedBuf)
    ) {
      throw new BadRequestException('Invalid webhook signature');
    }
  }
}
