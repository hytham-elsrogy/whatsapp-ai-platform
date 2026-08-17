import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmModule } from '@/modules/llm/llm.module';
import { RagModule } from '@/modules/rag/rag.module';
import { AiActionsModule } from '@/modules/ai-actions/ai-actions.module';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { AssignmentModule } from '@/modules/assignment/assignment.module';
import { DepartmentsModule } from '@/modules/departments/departments.module';
import { MetaModule } from '@/modules/meta/meta.module';
import { WhatsappNumbersModule } from '@/modules/whatsapp-numbers/whatsapp-numbers.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { AiAgent } from './entities/ai-agent.entity';
import { AiSession } from './entities/ai-session.entity';
import { AiMessage } from './entities/ai-message.entity';
import { AiAgentsService } from './ai-agents.service';
import { AiService } from './ai.service';
import { AiAgentsController } from './ai-agents.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiAgent, AiSession, AiMessage]),
    LlmModule,
    RagModule,
    AiActionsModule,
    ConversationsModule,
    AssignmentModule,
    DepartmentsModule,
    MetaModule,
    WhatsappNumbersModule,
    MessagesModule,
  ],
  providers: [AiAgentsService, AiService],
  controllers: [AiAgentsController],
  exports: [AiAgentsService, AiService],
})
export class AiAgentsModule {}
