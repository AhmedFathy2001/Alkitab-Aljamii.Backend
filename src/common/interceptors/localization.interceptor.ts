import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  import { Request } from 'express';
  
  @Injectable()
  export class LocalizationInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest<Request>();
      const lang = request.lang || 'en';
  
      return next.handle().pipe(
        map(data => this.localizeResponse(data, lang))
      );
    }
  
    private localizeResponse(data: any, lang: string): any {
      if (Array.isArray(data)) {
        return data.map(item => this.localizeResponse(item, lang));
      }
  
      if (data && typeof data === 'object') {
        const result = { ...data };
        
        // Apply localized values
        for (const key of Object.keys(result)) {
          if (key.endsWith('Ar') && lang === 'ar') {
            const baseKey = key.slice(0, -2);
            result[baseKey] = result[key] ?? result[baseKey];
          }
        }
        
        // Clean up *Ar fields
        for (const key of Object.keys(result)) {
          if (key.endsWith('Ar')) delete result[key];
        }
        
        return result;
      }
  
      return data;
    }
  }