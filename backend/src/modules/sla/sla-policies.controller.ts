import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { SlaService } from "./sla.service";
import { CreateSlaPolicyDto } from "./dto/create-sla-policy.dto";

@ApiTags("sla")
@ApiBearerAuth()
@Controller("sla-policies")
export class SlaPoliciesController {
  constructor(private readonly slaService: SlaService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.slaService.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.slaService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("settings.manage")
  create(@CurrentUser() user: User, @Body() dto: CreateSlaPolicyDto) {
    return this.slaService.create(user.tenantId, dto);
  }
}
