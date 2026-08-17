import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UsersModule } from "@/modules/users/users.module";
import { ConversationsModule } from "@/modules/conversations/conversations.module";
import { EventsGateway } from "./events.gateway";

@Module({
  imports: [JwtModule.register({}), UsersModule, ConversationsModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class RealtimeModule {}
