import {
  Controller, Get, Post, Body, Param, UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService, SendMessageDto } from './messages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('send')
  @ApiOperation({ summary: 'إرسال رسالة' })
  send(@Body() dto: SendMessageDto, @CurrentUser() user: User) {
    return this.messagesService.send(dto, user.id);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'رسائل محادثة' })
  getConversationMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: any,
  ) {
    return this.messagesService.getConversationMessages(conversationId, query);
  }

  @Get('search')
  @ApiOperation({ summary: 'البحث في الرسائل' })
  search(@Query('q') q: string, @Query('conversationId') conversationId?: string) {
    return this.messagesService.searchMessages(q, conversationId);
  }
}
