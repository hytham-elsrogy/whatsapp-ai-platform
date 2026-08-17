import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { TemplatesService } from '@/modules/templates/templates.service';
import { SendTemplateDto } from '@/modules/templates/dto/send-template.dto';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('whatsapp')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
export class WhatsappController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly templatesService: TemplatesService,
  ) {}

  @Post()
  send(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsAppService.sendText(user.tenantId, conversationId, dto.text, {
      type: 'agent',
      id: user.id,
    });
  }

  @Post('template')
  sendTemplate(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendTemplateDto,
  ) {
    return this.templatesService.sendApprovedTemplate(user.tenantId, conversationId, dto, {
      type: 'agent',
      id: user.id,
    });
  }
}
