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
    this.asyncLocalStorage.enterWith(context);
  }

  getContext(): RequestContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  getUserId(): string | undefined {
    return this.getContext()?.uid;
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
