import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MetaModule } from "@/modules/meta/meta.module";
import { MessagesModule } from "@/modules/messages/messages.module";
import { Attachment } from "./entities/attachment.entity";
import { StorageService } from "./storage.service";
import { AttachmentsService } from "./attachments.service";
import { AttachmentsController } from "./attachments.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Attachment]), MetaModule, MessagesModule],
  providers: [StorageService, AttachmentsService],
  controllers: [AttachmentsController],
  exports: [AttachmentsService],
})
export class UploadsModule {}
