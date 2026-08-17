import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaModule } from '@/modules/meta/meta.module';
import { WhatsappNumbersModule } from '@/modules/whatsapp-numbers/whatsapp-numbers.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { ComplianceModule } from '@/modules/compliance/compliance.module';
import { Template } from './entities/template.entity';
import { TemplateVariable } from './entities/template-variable.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template, TemplateVariable]),
    MetaModule,
    WhatsappNumbersModule,
    MessagesModule,
    ConversationsModule,
    RealtimeModule,
    ComplianceModule,
  ],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}
