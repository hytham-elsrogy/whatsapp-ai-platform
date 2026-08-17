import { createHash } from 'crypto';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ConsentsService } from '@/modules/consents/consents.service';

export class ComplianceCheckError extends Error {}

const DEFAULT_RATE_LIMIT_PER_MINUTE = 80; // WhatsApp Cloud API's lowest default messaging tier
const DUPLICATE_WINDOW_SECONDS = 10;

/**
 * Mandatory pre-send checks from docs/architecture/05-meta-integration-architecture.md
 * § 5 — checkOptIn, checkRateLimit (Redis sliding window per docs/architecture/01-system-architecture.md
 * § 5), checkPolicyRules (duplicate-message anti-spam). checkConversationWindow
 * and checkTemplate already exist in WhatsAppService/TemplatesService;
 * checkUserPermission is the existing RBAC guard layer. A failed check
 * throws with a specific reason — never a silent no-op.
 */
@Injectable()
export class ComplianceService implements OnModuleDestroy {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly redis: Redis;

  constructor(
    configService: ConfigService,
    private readonly consentsService: ConsentsService,
  ) {
    this.redis = new Redis({
      host: configService.get<string>('redis.host', 'localhost'),
      port: configService.get<number>('redis.port', 6379),
      password: configService.get<string>('redis.password', '') || undefined,
      lazyConnect: false,
      maxRetriesPerRequest: 1,
    });
    this.redis.on('error', (error) => this.logger.warn(`Redis connection issue: ${error.message}`));
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  async checkOptIn(customerId: string): Promise<void> {
    if (await this.consentsService.isOptedOut(customerId)) {
      throw new ComplianceCheckError('Customer has opted out of communications — message not sent');
    }
  }

  async checkRateLimit(phoneNumberId: string, limitPerMinute = DEFAULT_RATE_LIMIT_PER_MINUTE): Promise<void> {
    const bucket = Math.floor(Date.now() / 60_000);
    const key = `compliance:rate:${phoneNumberId}:${bucket}`;
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60);
    if (count > limitPerMinute) {
      throw new ComplianceCheckError(
        `Send rate limit exceeded for this WhatsApp number (${limitPerMinute}/min) — try again shortly`,
      );
    }
  }

  async checkDuplicateMessage(
    conversationId: string,
    text: string,
    windowSeconds = DUPLICATE_WINDOW_SECONDS,
  ): Promise<void> {
    const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
    const key = `compliance:dedupe:${conversationId}:${hash}`;
    const set = await this.redis.set(key, '1', 'EX', windowSeconds, 'NX');
    if (set === null) {
      throw new ComplianceCheckError(
        `Duplicate message — the same text was already sent to this conversation in the last ${windowSeconds}s`,
      );
    }
  }

  async runPreSendChecks(params: {
    customerId: string;
    phoneNumberId: string;
    conversationId: string;
    text: string;
  }): Promise<void> {
    await this.checkOptIn(params.customerId);
    await this.checkRateLimit(params.phoneNumberId);
    await this.checkDuplicateMessage(params.conversationId, params.text);
  }
}
