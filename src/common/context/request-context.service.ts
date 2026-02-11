import { Injectable, Module, Global } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  uid: string;
  username: string;
  role: string;
}

@Injectable()
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

  setContext(context: RequestContext): void {
    // console.log('[RequestContextService.setContext] Setting context:', context);
    this.asyncLocalStorage.enterWith(context);
    // Immediately verify it was set
    const verification = this.asyncLocalStorage.getStore();
    // console.log('[RequestContextService.setContext] Verification - context now is:', verification);
  }

  getContext(): RequestContext | undefined {
    const context = this.asyncLocalStorage.getStore();
    // console.log('[RequestContextService.getContext] Retrieved context:', context);
    return context;
  }

  getUserId(): string | undefined {
    const context = this.getContext();
    console.log('[RequestContextService.getUserId] Context:', context);
    return context?.uid;
  }

  getUsername(): string | undefined {
    return this.getContext()?.username;
  }

  getUserRole(): string | undefined {
    return this.getContext()?.role;
  }
}

@Global()
@Module({
  providers: [RequestContextService],
  exports: [RequestContextService],
})
export class RequestContextModule {}
