import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@Controller("reports")
@RequirePermissions("reports.view")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("overview")
  getOverview(@CurrentUser() user: User) {
    return this.reportsService.getOverview(user.tenantId);
  }

  @Get("agents")
  getAgentPerformance(@CurrentUser() user: User) {
    return this.reportsService.getAgentPerformance(user.tenantId);
  }

  @Get("ai")
  getAiAnalytics(@CurrentUser() user: User) {
    return this.reportsService.getAiAnalytics(user.tenantId);
  }

  @Get("sla")
  getSlaCompliance(@CurrentUser() user: User) {
    return this.reportsService.getSlaCompliance(user.tenantId);
  }
}
