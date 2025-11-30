import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
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
      map((data) => {
        // Skip localization for file streams
        if (data instanceof StreamableFile) {
          return data;
        }
        return this.localizeResponse(data, lang);
      }),
    );
  }

  private localizeResponse(data: any, lang: string): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.localizeResponse(item, lang));
    }

    if (typeof data === 'object') {
      const result: Record<string, any> = {};

      for (const key of Object.keys(data)) {
        const value = data[key];

        // Skip *Ar keys - we'll handle them when processing the base key
        if (key.endsWith('Ar')) {
          continue;
        }

        const arKey = `${key}Ar`;
        const hasArVersion = arKey in data;

        if (hasArVersion && lang === 'ar') {
          // Use Arabic value if available, fallback to base value
          result[key] = data[arKey] ?? value;
        } else if (hasArVersion) {
          // English - just use base value
          result[key] = value;
        } else if (
          typeof value === 'object' &&
          value !== null &&
          !(value instanceof Date)
        ) {
          // Recursively process nested objects/arrays
          result[key] = this.localizeResponse(value, lang);
        } else {
          result[key] = value;
        }
      }

      return result;
    }

    return data;
  }
}
