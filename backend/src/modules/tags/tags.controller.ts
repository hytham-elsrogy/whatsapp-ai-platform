import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagScope } from './entities/tag.entity';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query('scope') scope?: TagScope) {
    return this.tagsService.findAll(user.tenantId, scope);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTagDto) {
    return this.tagsService.create(user.tenantId, dto);
  }
}
