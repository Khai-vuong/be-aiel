import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true; // Allow access without JWT authentication
    }
    
    return super.canActivate(context); // Use default JWT authentication
  }

  //Additional custom error handling, dont really need but looks cool :3
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Check if route is public first
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return user; // Allow access for public routes
    }

    // Custom error messages for JWT authentication failures
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('JWT token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid JWT token');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('JWT token not active yet');
      }
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('No JWT bearer token provided');
      }
      
      // Check if Authorization header is missing
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        throw new UnauthorizedException('No JWT bearer token provided');
      }
      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Invalid authorization header format. Expected: Bearer <token>');
      }
      
      // Generic fallback
      throw new UnauthorizedException('JWT authentication failed');
    }
    
    return user;
  }
}