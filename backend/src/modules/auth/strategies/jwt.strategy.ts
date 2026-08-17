import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '@/modules/users/users.service';
import { User } from '@/modules/users/entities/user.entity';

export interface JwtAccessPayload {
  sub: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'jwt.accessSecret',
        'dev_access_secret_change_me_min_32_chars',
      ),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== 'active' || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException('Invalid or expired session');
    }
    return user;
  }
}
