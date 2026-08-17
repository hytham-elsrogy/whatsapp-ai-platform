import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateStatus } from './entities/template.entity';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.templatesService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('templates.manage')
  create(@CurrentUser() user: User, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.tenantId, user.id, dto);
  }

  @Post(':id/submit')
  @RequirePermissions('templates.manage')
  submit(@CurrentUser() user: User, @Param('id') id: string, @Body('whatsappNumberId') whatsappNumberId: string) {
    return this.templatesService.submitToMeta(user.tenantId, id, whatsappNumberId);
  }

  @Patch(':id/status')
  @RequirePermissions('templates.manage')
  setStatus(@CurrentUser() user: User, @Param('id') id: string, @Body('status') status: TemplateStatus) {
    return this.templatesService.setStatus(user.tenantId, id, status);
  }
}
