import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class JsonParseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        console.log('Intercepting response for JSON parsing', data);
        return this.parseJsonStrings(data);
      }),
    );
  }

  private parseJsonStrings(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // If it's a string, try to parse it as JSON
    if (typeof obj === 'string') {
      try {
        return JSON.parse(obj);
      } catch {
        // If parsing fails, return the original string
        return obj;
      }
    }

    // If it's an array, recursively process each element
    if (Array.isArray(obj)) {
      return obj.map((item) => this.parseJsonStrings(item));
    }

    // If it's an object, recursively process each property
    // The other if clauses are base cases!
    if (typeof obj === 'object') {
        const parsed: Record<string, any> = {};

        for (const [key, value] of Object.entries(obj)) {
            parsed[key] = this.parseJsonStrings(value);
        }

        return parsed;
    }

    

    return obj;
  }
}