import {
  Injectable, UnauthorizedException, BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { User } from '../users/entities/user.entity';
import { LoginDto, ChangePasswordDto } from './dto/login.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../common/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
      relations: ['department'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const isPasswordValid = await user.validatePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return { requires2FA: true, userId: user.id };
      }
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: loginDto.twoFactorCode,
        window: 2,
      });
      if (!isValid) {
        throw new UnauthorizedException('رمز المصادقة الثنائية غير صحيح');
      }
    }

    user.lastLoginAt = new Date();
    user.isOnline = true;
    await this.userRepository.save(user);

    const token = this.generateToken(user);

    await this.auditLogsService.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      details: { email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      accessToken: token,
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { isOnline: false, lastSeenAt: new Date() });
    await this.auditLogsService.log({ userId, action: AuditAction.LOGOUT, resource: 'auth' });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const isValid = await user.validatePassword(dto.currentPassword);
    if (!isValid) throw new BadRequestException('كلمة المرور الحالية غير صحيحة');

    user.password = dto.newPassword;
    await this.userRepository.save(user);
    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  async setup2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const secret = speakeasy.generateSecret({
      name: `WhatsApp CRM (${user.email})`,
      length: 32,
    });

    user.twoFactorSecret = secret.base32;
    await this.userRepository.save(user);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCode: qrCodeUrl };
  }

  async enable2FA(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) throw new BadRequestException('رمز التحقق غير صحيح');

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);
    return { message: 'تم تفعيل المصادقة الثنائية بنجاح' };
  }

  async disable2FA(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!isValid) throw new BadRequestException('رمز التحقق غير صحيح');

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);
    return { message: 'تم إلغاء تفعيل المصادقة الثنائية' };
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { password, twoFactorSecret, ...safeUser } = user as any;
    return safeUser;
  }
}
