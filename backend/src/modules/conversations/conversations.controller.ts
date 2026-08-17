import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import {
  ConversationFilter,
  ConversationsService,
} from "./conversations.service";
import { TransitionStatusDto } from "./dto/transition-status.dto";

@ApiTags("conversations")
@ApiBearerAuth()
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: User,
    @Query("filter") filter?: ConversationFilter,
  ) {
    return this.service.findAll(user.tenantId, filter ?? "all", user.id);
  }

  @Get(":id")
  findOne(@CurrentUser() user: User, @Param("id") id: string) {
    return this.service.findOne(user.tenantId, id);
  }

  @Patch(":id/status")
  async setStatus(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() dto: TransitionStatusDto,
  ) {
    const conversation = await this.service.findOne(user.tenantId, id);
    return this.service.transition(conversation, dto.status, {
      type: "agent",
      id: user.id,
    });
  }
}
