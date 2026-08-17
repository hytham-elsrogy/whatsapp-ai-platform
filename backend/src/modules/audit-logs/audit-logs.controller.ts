import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { AuditLogsService } from "./audit-logs.service";

@ApiTags("audit-logs")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @RequirePermissions("audit_logs.view")
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }
}
