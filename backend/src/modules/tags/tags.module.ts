import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationsModule } from "@/modules/conversations/conversations.module";
import { Tag } from "./entities/tag.entity";
import { ConversationTag } from "./entities/conversation-tag.entity";
import { CustomerTag } from "./entities/customer-tag.entity";
import { TagsService } from "./tags.service";
import { TagsController } from "./tags.controller";
import { ConversationTagsController } from "./conversation-tags.controller";
import { CustomerTagsController } from "./customer-tags.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, ConversationTag, CustomerTag]),
    ConversationsModule,
  ],
  providers: [TagsService],
  controllers: [
    TagsController,
    ConversationTagsController,
    CustomerTagsController,
  ],
  exports: [TagsService],
})
export class TagsModule {}
