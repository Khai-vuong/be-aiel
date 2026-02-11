import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // console.log('[RequestContextInterceptor] User from request:', user);
    
    // Set context if user is authenticated
    if (user) {
      // console.log('[RequestContextInterceptor] Setting context with uid:', user.uid);
      this.requestContextService.setContext({
        uid: user.uid,
        username: user.username,
        role: user.role,
      });
    //   console.log('[RequestContextInterceptor] Context set. Verifying:', this.requestContextService.getUserId());
    } else {
    //   console.log('[RequestContextInterceptor] No user found in request');
    }

    return next.handle();
  }
}
