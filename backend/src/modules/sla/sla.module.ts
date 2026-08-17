import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { SlaPolicy } from './entities/sla-policy.entity';
import { SlaBreach } from './entities/sla-breach.entity';
import { SlaService } from './sla.service';
import { SlaPoliciesController } from './sla-policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SlaPolicy, SlaBreach]), NotificationsModule],
  providers: [SlaService],
  controllers: [SlaPoliciesController],
  exports: [SlaService],
})
export class SlaModule {}
