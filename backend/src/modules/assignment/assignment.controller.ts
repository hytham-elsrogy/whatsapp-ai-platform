import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { AssignmentService } from './assignment.service';
import { AssignConversationDto, TransferConversationDto } from './dto/assign-conversation.dto';

@ApiTags('assignment')
@ApiBearerAuth()
@Controller('conversations/:conversationId')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('assign')
  @RequirePermissions('conversations.assign')
  assign(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.assignmentService.assign(user.tenantId, conversationId, dto.agentId, {
      type: 'agent',
      id: user.id,
    });
  }

  @Post('transfer')
  @RequirePermissions('conversations.assign')
  transfer(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: TransferConversationDto,
  ) {
    return this.assignmentService.transfer(user.tenantId, conversationId, dto.departmentId, {
      type: 'agent',
      id: user.id,
    });
  }
}
