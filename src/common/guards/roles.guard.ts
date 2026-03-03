import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly ALLOW_ALL_KEYWORDS = [
    'any',
    'anyone',
    'everyone',
    'all',
    'authenticated',
  ];

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      throw new ForbiddenException('User role not found');
    }

    // ✅ Nếu route không yêu cầu role cụ thể → cho qua
    if (!requiredRoles) {
      return true;
    }

    // ✅ Allow all authenticated users
    const hasAllowAllKeyword = requiredRoles.some((role) =>
      this.ALLOW_ALL_KEYWORDS.includes(role.toLowerCase()),
    );
    if (hasAllowAllKeyword) {
      return true;
    }

    // ===============================
    // ===============================
    const userRoleNormalized = user.role.toLowerCase();

    const isPermitted = requiredRoles.some(
      (role) => role.toLowerCase() === userRoleNormalized,
    );

    if (!isPermitted) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
