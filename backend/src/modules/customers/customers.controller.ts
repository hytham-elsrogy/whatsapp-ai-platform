import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { CustomersService } from "./customers.service";

@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.service.findOne(user.tenantId, id);
  }
}
