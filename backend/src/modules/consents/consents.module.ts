import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomersModule } from "@/modules/customers/customers.module";
import { CustomerConsent } from "./entities/customer-consent.entity";
import { ConsentsService } from "./consents.service";
import { ConsentsController } from "./consents.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CustomerConsent]), CustomersModule],
  providers: [ConsentsService],
  controllers: [ConsentsController],
  exports: [ConsentsService],
})
export class ConsentsModule {}
