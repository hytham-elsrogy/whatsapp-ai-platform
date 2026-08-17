import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Message } from "./entities/message.entity";
import { MessageStatusEntity } from "./entities/message-status.entity";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { ConversationsModule } from "@/modules/conversations/conversations.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageStatusEntity]),
    ConversationsModule,
  ],
  providers: [MessagesService],
  controllers: [MessagesController],
  exports: [MessagesService],
})
export class MessagesModule {}
