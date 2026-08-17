import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "@/common/decorators/permissions.decorator";
import { SUPER_ADMIN_ROLE } from "@/common/constants/system-roles";
import { User } from "@/modules/users/entities/user.entity";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user: User = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException("Unauthorized");
    if (user.role?.name === SUPER_ADMIN_ROLE) return true;

    const userPermissions = (user.role?.permissions || []).map((p) => p.code);
    const hasPermission = required.every((code) =>
      userPermissions.includes(code),
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to perform this action",
      );
    }
    return true;
  }
}
