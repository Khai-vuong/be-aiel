import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    
    console.log('[RequestContextMiddleware] User from request:', user);
    
    if (user) {
      console.log('[RequestContextMiddleware] Setting context with uid:', user.uid);
      this.requestContextService.setContext({
        uid: user.uid,
        username: user.username,
        role: user.role,
      });
      console.log('[RequestContextMiddleware] Context set. Verifying:', this.requestContextService.getUserId());
    } else {
      console.log('[RequestContextMiddleware] No user found in request');
    }
    
    next();
  }
}
