import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  ConversationsService,
  CreateConversationDto,
  UpdateConversationDto,
  TransferConversationDto,
  AddNoteDto,
  RateConversationDto,
} from './conversations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء محادثة جديدة' })
  create(@Body() dto: CreateConversationDto, @CurrentUser() user: User) {
    return this.conversationsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المحادثات' })
  findAll(@Query() query: any, @CurrentUser() user: User) {
    return this.conversationsService.findAll({ ...query, currentUser: user });
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات المحادثات' })
  getStats() {
    return this.conversationsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل محادثة' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حالة محادثة' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: User,
  ) {
    return this.conversationsService.update(id, dto, user);
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'تحويل محادثة' })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferConversationDto,
    @CurrentUser() user: User,
  ) {
    return this.conversationsService.transfer(id, dto, user.id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'إضافة ملاحظة داخلية' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser() user: User,
  ) {
    return this.conversationsService.addNote(id, dto, user.id);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'ملاحظات المحادثة' })
  getNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.getNotes(id);
  }

  @Get(':id/transfers')
  @ApiOperation({ summary: 'سجل تحويلات المحادثة' })
  getTransfers(@Param('id', ParseUUIDPipe) id: string) {
    return this.conversationsService.getTransfers(id);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'تقييم الخدمة' })
  rate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RateConversationDto) {
    return this.conversationsService.rate(id, dto);
  }

  @Post(':id/auto-assign')
  @ApiOperation({ summary: 'التعيين التلقائي' })
  autoAssign(@Param('id', ParseUUIDPipe) id: string, @Query('departmentId') departmentId?: string) {
    return this.conversationsService.autoAssign(id, departmentId);
  }
}
