import { Controller, Delete, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { DocumentsService } from './documents.service';

@ApiTags('knowledge-base')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.documentsService.findOneWithChunks(user.tenantId, id);
  }

  @Delete(':id')
  @RequirePermissions('knowledge_base.manage')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.documentsService.remove(user.tenantId, id);
  }
}
