import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaModule } from '@/modules/meta/meta.module';
import { WhatsappNumbersModule } from '@/modules/whatsapp-numbers/whatsapp-numbers.module';
import { CustomersModule } from '@/modules/customers/customers.module';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { AssignmentModule } from '@/modules/assignment/assignment.module';
import { ChatbotModule } from '@/modules/chatbot/chatbot.module';
import { AiAgentsModule } from '@/modules/ai-agents/ai-agents.module';
import { TemplatesModule } from '@/modules/templates/templates.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { ConsentsModule } from '@/modules/consents/consents.module';
import { UploadsModule } from '@/modules/uploads/uploads.module';
import { WebhookEvent } from './entities/webhook-event.entity';
import { WhatsAppService } from './whatsapp.service';
import { WebhookController } from './webhook.controller';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappInboundProcessor } from '@/queue/processors/whatsapp-inbound.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent]),
    MetaModule,
    WhatsappNumbersModule,
    CustomersModule,
    ConversationsModule,
    MessagesModule,
    AssignmentModule,
    ChatbotModule,
    AiAgentsModule,
    TemplatesModule,
    RealtimeModule,
    ComplianceModule,
    ConsentsModule,
    UploadsModule,
  ],
  controllers: [WebhookController, WhatsappController],
  // The inbound-processing worker only runs in the `worker` process
  // (WORKER_MODE=true) — the `backend` API process enqueues jobs via the
  // fast-ack webhook pattern but never consumes them itself, so a burst of
  // inbound webhooks can't add latency to API request handling.
  providers: [WhatsAppService, ...(process.env.WORKER_MODE === 'true' ? [WhatsappInboundProcessor] : [])],
  exports: [WhatsAppService],
})
export class WhatsappModule {}
