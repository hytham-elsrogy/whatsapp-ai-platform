import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-comment.dto';
import { TicketStatus } from './entities/ticket.entity';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.ticketsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ticketsService.findOne(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.ticketsService.create(user.tenantId, user.id, dto);
  }

  @Post(':id/comments')
  addComment(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: CreateTicketCommentDto) {
    return this.ticketsService.addComment(user.tenantId, id, user.id, dto);
  }

  @Patch(':id/status')
  transition(@CurrentUser() user: User, @Param('id') id: string, @Body('status') status: TicketStatus) {
    return this.ticketsService.transition(user.tenantId, id, status, user.id);
  }
}
