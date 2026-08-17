import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
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
  list(@Param("conversationId") conversationId: string) {
    return this.tagsService.listForConversation(conversationId);
  }

  @Post()
  async attach(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Body("tagId") tagId?: string,
    @Body("name") name?: string,
  ) {
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
    return this.tagsService.listForConversation(conversationId);
  }

  @Delete(":tagId")
  async detach(
    @Param("conversationId") conversationId: string,
    @Param("tagId") tagId: string,
  ) {
    await this.tagsService.detachFromConversation(conversationId, tagId);
    return this.tagsService.listForConversation(conversationId);
  }
}
