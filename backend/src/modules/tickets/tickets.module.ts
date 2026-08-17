import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SlaModule } from '@/modules/sla/sla.module';
import { DepartmentsModule } from '@/modules/departments/departments.module';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { AuditLogsModule } from '@/modules/audit-logs/audit-logs.module';
import { Conversation } from '@/modules/conversations/entities/conversation.entity';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SlaSweepService } from './sla-sweep.service';
import { SlaSweepProcessor } from './processors/sla-sweep.processor';
import { SLA_SWEEP_QUEUE, SLA_SWEEP_INTERVAL_MS } from './sla-sweep.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketComment, Conversation]),
    BullModule.registerQueue({ name: SLA_SWEEP_QUEUE }),
    SlaModule,
    DepartmentsModule,
    ConversationsModule,
    AuditLogsModule,
  ],
  // Same worker/backend split as WhatsappModule — sweeping is a background
  // job, not an API-request concern.
  providers: [TicketsService, SlaSweepService, ...(process.env.WORKER_MODE === 'true' ? [SlaSweepProcessor] : [])],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule implements OnModuleInit {
  constructor(@InjectQueue(SLA_SWEEP_QUEUE) private readonly slaSweepQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    // jobId keeps this idempotent across restarts — BullMQ won't duplicate a
    // repeatable job already registered under the same id/pattern.
    await this.slaSweepQueue.add(
      'sweep',
      {},
      { repeat: { every: SLA_SWEEP_INTERVAL_MS }, jobId: 'sla-sweep-repeat' },
    );
  }
}
