import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, Permission, PERMISSION_GROUPS, DEFAULT_ROLE_PERMISSIONS } from '../../common/enums';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('permissions-config')
  @ApiOperation({ summary: 'قائمة الصلاحيات المتاحة ومجموعاتها' })
  getPermissionsConfig() {
    return {
      groups: PERMISSION_GROUPS,
      defaults: DEFAULT_ROLE_PERMISSIONS,
    };
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Permissions(Permission.USERS_CREATE)
  @ApiOperation({ summary: 'إنشاء مستخدم جديد' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Permissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'قائمة المستخدمين' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @Permissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'إحصائيات المستخدمين' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @Permissions(Permission.USERS_VIEW)
  @ApiOperation({ summary: 'بيانات مستخدم محدد' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions(Permission.USERS_EDIT)
  @ApiOperation({ summary: 'تعديل بيانات مستخدم' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(Permission.USERS_DELETE)
  @ApiOperation({ summary: 'تعطيل مستخدم' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.remove(id, user.id);
  }
}
