import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { IntegrationsService } from "./integrations.service";
import { IntegrationExecutorService } from "./integration-executor.service";
import { CreateIntegrationDto } from "./dto/create-integration.dto";

@ApiTags("integrations")
@ApiBearerAuth()
@Controller("integrations")
@RequirePermissions("settings.manage")
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationExecutorService: IntegrationExecutorService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.integrationsService.findAll(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(user.tenantId, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: Partial<CreateIntegrationDto>,
  ) {
    return this.integrationsService.update(user.tenantId, id, dto);
  }

  @Post(":id/test")
  async testConnection(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body("action") action: string,
  ) {
    const integration = await this.integrationsService.findOne(
      user.tenantId,
      id,
    );
    return this.integrationExecutorService.testConnection(
      user.tenantId,
      integration,
      action,
      {},
    );
  }
}
