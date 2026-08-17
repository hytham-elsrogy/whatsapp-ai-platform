import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TemplatesService, CreateTemplateDto, UpdateTemplateDto } from './templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء قالب رد' })
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: User) {
    return this.templatesService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة قوالب الردود' })
  findAll(@Query() query: any, @CurrentUser() user: User) {
    return this.templatesService.findAll({ ...query, userId: user.id });
  }

  @Get('categories')
  @ApiOperation({ summary: 'تصنيفات القوالب' })
  getCategories() {
    return this.templatesService.getCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'قالب محدد' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تعديل قالب' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف قالب' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.remove(id);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'تسجيل استخدام قالب' })
  use(@Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.incrementUsage(id);
  }
}
