import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, UserRole } from '../enums';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('غير مصرح بالوصول');

    if (user.role === UserRole.SUPER_ADMIN) return true;

    const userPerms: string[] = user.permissions || [];
    const hasPermission = required.some((p) => userPerms.includes(p));

    if (!hasPermission) {
      throw new ForbiddenException('ليس لديك الصلاحية للقيام بهذا الإجراء');
    }

    return true;
  }
}
