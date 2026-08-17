import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { MessagesService } from "@/modules/messages/messages.service";
import { AttachmentsService } from "./attachments.service";

@ApiTags("attachments")
@ApiBearerAuth()
@Controller("messages/:messageId/attachments")
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get()
  async findForMessage(
    @CurrentUser() user: User,
    @Param("messageId") messageId: string,
  ) {
    await this.messagesService.findOne(user.tenantId, messageId); // tenant-scope check
    const attachments = await this.attachmentsService.findByMessage(messageId);
    return Promise.all(
      attachments.map(async (a) => ({
        id: a.id,
        mimeType: a.mimeType,
        size: a.size,
        caption: a.caption,
        url: await this.attachmentsService.getPresignedUrl(a.id),
      })),
    );
  }
}
