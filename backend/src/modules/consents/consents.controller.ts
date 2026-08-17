import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { CustomersService } from "@/modules/customers/customers.service";
import { ConsentsService } from "./consents.service";
import { RecordConsentDto } from "./dto/record-consent.dto";

@ApiTags("consents")
@ApiBearerAuth()
@Controller("customers/:customerId/consent")
export class ConsentsController {
  constructor(
    private readonly consentsService: ConsentsService,
    private readonly customersService: CustomersService,
  ) {}

  @Get()
  async getLatest(
    @CurrentUser() user: User,
    @Param("customerId") customerId: string,
  ) {
    await this.customersService.findOne(user.tenantId, customerId); // tenant-scope check
    return (
      (await this.consentsService.getLatest(customerId)) ?? {
        consentStatus: "unknown",
      }
    );
  }

  @Get("history")
  async history(
    @CurrentUser() user: User,
    @Param("customerId") customerId: string,
  ) {
    await this.customersService.findOne(user.tenantId, customerId); // tenant-scope check
    return this.consentsService.history(customerId);
  }

  @Post()
  async record(
    @CurrentUser() user: User,
    @Param("customerId") customerId: string,
    @Body() dto: RecordConsentDto,
  ) {
    await this.customersService.findOne(user.tenantId, customerId); // tenant-scope check
    return this.consentsService.record(
      customerId,
      dto.status,
      dto.type,
      "manual",
    );
  }
}
