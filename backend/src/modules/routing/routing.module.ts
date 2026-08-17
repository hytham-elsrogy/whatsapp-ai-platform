import { Module } from '@nestjs/common';
import { DepartmentsModule } from '@/modules/departments/departments.module';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { TagsModule } from '@/modules/tags/tags.module';
import { RoutingService } from './routing.service';

@Module({
  imports: [DepartmentsModule, ConversationsModule, TagsModule],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}
