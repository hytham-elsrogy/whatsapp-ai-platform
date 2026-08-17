import { Module } from '@nestjs/common';
import { ConversationsModule } from '@/modules/conversations/conversations.module';
import { DepartmentsModule } from '@/modules/departments/departments.module';
import { RoutingModule } from '@/modules/routing/routing.module';
import { AuditLogsModule } from '@/modules/audit-logs/audit-logs.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';

@Module({
  imports: [
    ConversationsModule,
    DepartmentsModule,
    RoutingModule,
    AuditLogsModule,
    NotificationsModule,
    RealtimeModule,
  ],
  providers: [AssignmentService],
  controllers: [AssignmentController],
  exports: [AssignmentService],
})
export class AssignmentModule {}
