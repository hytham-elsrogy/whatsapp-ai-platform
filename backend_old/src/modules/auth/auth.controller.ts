import {
  Controller, Post, Get, Body, UseGuards, Req, Patch, SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'تسجيل الدخول' })
  login(@Body() loginDto: LoginDto, @Req() req: any) {
    return this.authService.login(
      loginDto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تسجيل الخروج' })
  logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'بيانات المستخدم الحالي' })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تغيير كلمة المرور' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إعداد المصادقة الثنائية' })
  setup2FA(@CurrentUser() user: User) {
    return this.authService.setup2FA(user.id);
  }

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تفعيل المصادقة الثنائية' })
  enable2FA(@CurrentUser() user: User, @Body('token') token: string) {
    return this.authService.enable2FA(user.id, token);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إلغاء تفعيل المصادقة الثنائية' })
  disable2FA(@CurrentUser() user: User, @Body('token') token: string) {
    return this.authService.disable2FA(user.id, token);
  }
}
