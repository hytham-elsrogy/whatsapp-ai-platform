import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { TagsService } from "./tags.service";

@ApiTags("tags")
@ApiBearerAuth()
@Controller("customers/:customerId/tags")
export class CustomerTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(@CurrentUser() user: User, @Param("customerId") customerId: string) {
    return this.tagsService.listForCustomer(user.tenantId, customerId);
  }

  @Post()
  async attach(
    @CurrentUser() user: User,
    @Param("customerId") customerId: string,
    @Body("tagId") tagId?: string,
    @Body("name") name?: string,
  ) {
    if (!tagId && !name) {
      throw new BadRequestException("Either tagId or name is required");
    }
    const resolvedTagId =
      tagId ??
      (
        await this.tagsService.findOrCreateByName(
          user.tenantId,
          name!,
          "customer",
        )
      ).id;
    await this.tagsService.attachToCustomer(
      user.tenantId,
      customerId,
      resolvedTagId,
    );
    return this.tagsService.listForCustomer(user.tenantId, customerId);
  }

  @Delete(":tagId")
  async detach(
    @CurrentUser() user: User,
    @Param("customerId") customerId: string,
    @Param("tagId") tagId: string,
  ) {
    await this.tagsService.detachFromCustomer(user.tenantId, customerId, tagId);
    return this.tagsService.listForCustomer(user.tenantId, customerId);
  }
}
