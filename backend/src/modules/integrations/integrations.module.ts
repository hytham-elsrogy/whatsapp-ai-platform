import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Integration } from "./entities/integration.entity";
import { ApiLog } from "./entities/api-log.entity";
import { IntegrationsService } from "./integrations.service";
import { IntegrationExecutorService } from "./integration-executor.service";
import { IntegrationsController } from "./integrations.controller";
import { GenericHttpAdapter } from "./adapters/generic-http.adapter";
import { OdooAdapter } from "./adapters/odoo.adapter";
import { OracleApexAdapter } from "./adapters/oracle-apex.adapter";

@Module({
  imports: [TypeOrmModule.forFeature([Integration, ApiLog])],
  providers: [
    IntegrationsService,
    IntegrationExecutorService,
    GenericHttpAdapter,
    OdooAdapter,
    OracleApexAdapter,
  ],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, IntegrationExecutorService],
})
export class IntegrationsModule {}
