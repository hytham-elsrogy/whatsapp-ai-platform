import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WhatsAppService } from "@/modules/whatsapp/whatsapp.service";
import { WebhookEvent } from "@/modules/whatsapp/entities/webhook-event.entity";
import { WHATSAPP_INBOUND_QUEUE } from "../queue.module";

@Processor(WHATSAPP_INBOUND_QUEUE)
export class WhatsappInboundProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappInboundProcessor.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepo: Repository<WebhookEvent>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    await this.whatsAppService.handleInboundEvent(job.data);
    if (job.id) {
      await this.webhookEventRepo.update(
        { eventId: job.id },
        { processed: true },
      );
    }
    this.logger.log(`Processed inbound webhook event ${job.id}`);
  }
}
