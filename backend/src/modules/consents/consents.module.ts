import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerConsent } from "./entities/customer-consent.entity";
import { ConsentsService } from "./consents.service";
import { ConsentsController } from "./consents.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerConsent])],
  providers: [ConsentsService],
  controllers: [ConsentsController],
  exports: [ConsentsService],
})
export class ConsentsModule {}
