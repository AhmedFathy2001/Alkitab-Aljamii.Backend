import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  PaginationMeta,
  PaginatedResult,
} from '../pagination/pagination.dto.js';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Skip transformation for file streams
        if (data instanceof StreamableFile) {
          return data as T;
        }

        if (this.isPaginatedData(data)) {
          return {
            success: true,
            data: data.items as T,
            meta: data.meta,
          };
        }

        return {
          success: true,
          data: data as T,
        };
      }),
    );
  }

  private isPaginatedData(data: unknown): data is PaginatedResult<unknown> {
    return (
      data !== null &&
      typeof data === 'object' &&
      'items' in data &&
      'meta' in data
    );
  }
}
