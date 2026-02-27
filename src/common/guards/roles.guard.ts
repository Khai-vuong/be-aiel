import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
// import { RequestContextService } from '../context';

@Injectable()
export class RolesGuard implements CanActivate {
  // Special keywords that allow any authenticated user
  private readonly ALLOW_ALL_KEYWORDS = [
    'any',
    'anyone',
    'everyone',
    'all',
    'authenticated',
  ];

  constructor(
    private reflector: Reflector,
    // private requestContextService: RequestContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) { return true; }



    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.role) {
      throw new ForbiddenException('User role not found');
    }

    // Always set user context for authenticated requests
    // this.requestContextService.setContext({
    //   uid: user.uid,
    //   username: user.username,
    //   role: user.role,
    //   roleId: user.roleId,
    // });

    // If no roles required, allow access after setting context
    if (!requiredRoles) {
      return true;
    }

    // Check if any of the required roles is a special keyword that allows all authenticated users
    const hasAllowAllKeyword = requiredRoles.some((role) => 
      this.ALLOW_ALL_KEYWORDS.includes(role.toLowerCase())
    );

    if (hasAllowAllKeyword) {
      return true;
    }

    const isPermitted = requiredRoles.some((role) => user.role === role);
    
    if (!isPermitted) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user.role}`);
    }

    return true;
  }
}