import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { User } from "@/modules/users/entities/user.entity";
import { TemplatesService } from "@/modules/templates/templates.service";
import { SendTemplateDto } from "@/modules/templates/dto/send-template.dto";
import { WhatsAppService } from "./whatsapp.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { SendMediaDto } from "./dto/send-media.dto";

// WhatsApp Cloud API's own largest per-type limit (document, 100MB) — the
// per-type limits actually enforced live in WhatsAppService.validateMediaFile;
// this is just the outer Multer ceiling so oversized uploads are rejected
// before the whole file is buffered into memory.
const MAX_MEDIA_UPLOAD_BYTES = 100 * 1024 * 1024;

@ApiTags("whatsapp")
@ApiBearerAuth()
@Controller("conversations/:conversationId/messages")
export class WhatsappController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly templatesService: TemplatesService,
  ) {}

  @Post()
  send(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsAppService.sendText(
      user.tenantId,
      conversationId,
      dto.text,
      {
        type: "agent",
        id: user.id,
      },
    );
  }

  @Post("media")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_MEDIA_UPLOAD_BYTES } }),
  )
  sendMedia(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Body() dto: SendMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    return this.whatsAppService.sendMedia(
      user.tenantId,
      conversationId,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      },
      dto,
      { type: "agent", id: user.id },
    );
  }

  @Post("template")
  sendTemplate(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Body() dto: SendTemplateDto,
  ) {
    return this.templatesService.sendApprovedTemplate(
      user.tenantId,
      conversationId,
      dto,
      {
        type: "agent",
        id: user.id,
      },
    );
  }
}
