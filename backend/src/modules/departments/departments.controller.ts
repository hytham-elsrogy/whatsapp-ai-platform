import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { RequirePermissions } from "@/common/decorators/permissions.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@ApiTags("departments")
@ApiBearerAuth()
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.departmentsService.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.departmentsService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions("departments.manage")
  create(@CurrentUser() user: User, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(user.tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions("departments.manage")
  update(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.tenantId, id, dto);
  }
}
