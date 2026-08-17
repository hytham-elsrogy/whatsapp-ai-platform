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
@Controller("conversations/:conversationId/tags")
export class ConversationTagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  list(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
  ) {
    return this.tagsService.listForConversation(user.tenantId, conversationId);
  }

  @Post()
  async attach(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
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
          "conversation",
        )
      ).id;
    await this.tagsService.attachToConversation(
      user.tenantId,
      conversationId,
      resolvedTagId,
    );
    return this.tagsService.listForConversation(user.tenantId, conversationId);
  }

  @Delete(":tagId")
  async detach(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Param("tagId") tagId: string,
  ) {
    await this.tagsService.detachFromConversation(
      user.tenantId,
      conversationId,
      tagId,
    );
    return this.tagsService.listForConversation(user.tenantId, conversationId);
  }
}
