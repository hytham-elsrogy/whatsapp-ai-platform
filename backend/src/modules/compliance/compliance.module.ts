import { Module } from '@nestjs/common';
import { ConsentsModule } from '@/modules/consents/consents.module';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [ConsentsModule],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
