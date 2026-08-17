import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { MetaModule } from "@/modules/meta/meta.module";
import { WhatsappNumbersModule } from "@/modules/whatsapp-numbers/whatsapp-numbers.module";
import { MessagesModule } from "@/modules/messages/messages.module";
import { ConversationsModule } from "@/modules/conversations/conversations.module";
import { AssignmentModule } from "@/modules/assignment/assignment.module";
import { AiAgentsModule } from "@/modules/ai-agents/ai-agents.module";
import { TagsModule } from "@/modules/tags/tags.module";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { ChatbotFlow } from "./entities/chatbot-flow.entity";
import { ChatbotNode } from "./entities/chatbot-node.entity";
import { ChatbotEdge } from "./entities/chatbot-edge.entity";
import { ChatbotSession } from "./entities/chatbot-session.entity";
import { ChatbotFlowsService } from "./chatbot-flows.service";
import { ChatbotFlowsController } from "./chatbot-flows.controller";
import { ChatbotService } from "./chatbot.service";
import { ChatbotDelayProcessor } from "./processors/chatbot-delay.processor";
import { CHATBOT_DELAY_QUEUE } from "./chatbot-delay.constants";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatbotFlow,
      ChatbotNode,
      ChatbotEdge,
      ChatbotSession,
      Conversation,
    ]),
    BullModule.registerQueue({ name: CHATBOT_DELAY_QUEUE }),
    MetaModule,
    WhatsappNumbersModule,
    MessagesModule,
    ConversationsModule,
    AssignmentModule,
    AiAgentsModule,
    TagsModule,
  ],
  // Same worker/backend split as WhatsappModule (see its comment for the
  // NODE_ENV fallback).
  providers: [
    ChatbotFlowsService,
    ChatbotService,
    ...(process.env.WORKER_MODE === "true" ||
    process.env.NODE_ENV !== "production"
      ? [ChatbotDelayProcessor]
      : []),
  ],
  controllers: [ChatbotFlowsController],
  exports: [ChatbotFlowsService, ChatbotService],
})
export class ChatbotModule {}
