import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { WhatsappNumbersService } from './whatsapp-numbers.service';
import { CreateWhatsappNumberDto } from './dto/create-whatsapp-number.dto';
import { UpdateWhatsappNumberDto } from './dto/update-whatsapp-number.dto';

@ApiTags('whatsapp-numbers')
@ApiBearerAuth()
@Controller('whatsapp-numbers')
export class WhatsappNumbersController {
  constructor(private readonly service: WhatsappNumbersService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.tenantId);
  }

  @Post()
  @RequirePermissions('settings.manage')
  create(@CurrentUser() user: User, @Body() dto: CreateWhatsappNumberDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermissions('settings.manage')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateWhatsappNumberDto) {
    return this.service.update(user.tenantId, id, dto);
  }
}
