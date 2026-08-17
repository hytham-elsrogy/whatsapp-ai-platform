import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { RolesPermissionsModule } from "./modules/roles-permissions/roles-permissions.module";
import { UsersModule } from "./modules/users/users.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { QueueModule } from "./queue/queue.module";
import { MetaModule } from "./modules/meta/meta.module";
import { WhatsappNumbersModule } from "./modules/whatsapp-numbers/whatsapp-numbers.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { RoutingModule } from "./modules/routing/routing.module";
import { AssignmentModule } from "./modules/assignment/assignment.module";
import { ChatbotModule } from "./modules/chatbot/chatbot.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";
import { AiAgentsModule } from "./modules/ai-agents/ai-agents.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { SlaModule } from "./modules/sla/sla.module";
import { TicketsModule } from "./modules/tickets/tickets.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { TagsModule } from "./modules/tags/tags.module";
import { ConsentsModule } from "./modules/consents/consents.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { UploadsModule } from "./modules/uploads/uploads.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get("database.host"),
        port: config.get("database.port"),
        username: config.get("database.user"),
        password: config.get("database.password"),
        database: config.get("database.name"),
        entities: [__dirname + "/modules/**/*.entity{.ts,.js}"],
        synchronize: false,
        logging: config.get("database.logging"),
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    QueueModule,
    TenantsModule,
    RolesPermissionsModule,
    UsersModule,
    DepartmentsModule,
    AuthModule,
    HealthModule,
    AuditLogsModule,
    MetaModule,
    WhatsappNumbersModule,
    CustomersModule,
    ConversationsModule,
    RoutingModule,
    AssignmentModule,
    MessagesModule,
    ChatbotModule,
    KnowledgeBaseModule,
    AiAgentsModule,
    WhatsappModule,
    NotificationsModule,
    SlaModule,
    TicketsModule,
    TemplatesModule,
    RealtimeModule,
    ReportsModule,
    IntegrationsModule,
    TagsModule,
    ConsentsModule,
    ComplianceModule,
    UploadsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
