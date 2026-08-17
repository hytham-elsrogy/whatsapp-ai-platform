import { createHash, randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IsNull, MoreThan, Repository } from 'typeorm';
import ms from 'ms';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/modules/users/entities/user.entity';
import { RefreshToken } from '@/modules/users/entities/refresh-token.entity';
import { JwtAccessPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordValid = await user.validatePassword(password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return user;
  }

  async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtAccessPayload = { sub: user.id, tenantId: user.tenantId };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(
        'jwt.accessSecret',
        'dev_access_secret_change_me_min_32_chars',
      ),
      expiresIn: this.configService.get<string>('jwt.accessExpires', '15m'),
    });

    const rawRefreshToken = randomUUID() + randomUUID();
    const refreshTokenExpiresAt = new Date(
      Date.now() + ms(this.configService.get<string>('jwt.refreshExpires', '30d')),
    );
    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: refreshTokenExpiresAt,
    });
    await this.refreshTokenRepository.save(refreshToken);

    await this.usersService.touchLastLogin(user.id);

    return { accessToken, refreshToken: rawRefreshToken, refreshTokenExpiresAt };
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });
    if (!existing) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    existing.revokedAt = new Date();
    await this.refreshTokenRepository.save(existing);

    const user = await this.usersService.findById(existing.userId);
    return this.issueTokens(user);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revokedAt: new Date() });
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
