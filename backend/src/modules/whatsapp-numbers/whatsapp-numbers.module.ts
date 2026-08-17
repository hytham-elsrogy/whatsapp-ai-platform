import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WhatsappNumber } from "./entities/whatsapp-number.entity";
import { WhatsappNumbersService } from "./whatsapp-numbers.service";
import { WhatsappNumbersController } from "./whatsapp-numbers.controller";

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappNumber])],
  providers: [WhatsappNumbersService],
  controllers: [WhatsappNumbersController],
  exports: [WhatsappNumbersService],
})
export class WhatsappNumbersModule {}
