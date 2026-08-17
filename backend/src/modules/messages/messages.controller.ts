import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { ConversationsService } from '@/modules/conversations/conversations.service';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    await this.conversationsService.findOne(user.tenantId, conversationId);
    return this.messagesService.findByConversation(conversationId);
  }
}
