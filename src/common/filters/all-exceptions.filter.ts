import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

const messages = {
  en: {
    INTERNAL_SERVER_ERROR: 'Internal server error',
    FORBIDDEN: 'You do not have permission',
    UNAUTHORIZED: 'Unauthorized access',
  },
  ar: {
    INTERNAL_SERVER_ERROR: 'حدث خطأ في الخادم',
    FORBIDDEN: 'ليس لديك إذن للوصول',
    UNAUTHORIZED: 'دخول غير مصرح به',
  },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const lang = request.lang || 'en'; 

    const { status, message, error, details } = this.extractErrorInfo(exception, lang);

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (details) {
      errorResponse.details = details;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(errorResponse);
  }

  private extractErrorInfo(
    exception: unknown,
    lang: 'en' | 'ar',
  ): { status: number; message: string; error: string; details?: unknown } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        return {
          status,
          message: exceptionResponse,
          error: HttpStatus[status] ?? 'Error',
        };
      }

      const responseObj = exceptionResponse as Record<string, unknown>;
      let message = (responseObj['message'] as string) ?? messages[lang].INTERNAL_SERVER_ERROR;
      let error = (responseObj['error'] as string) ?? HttpStatus[status]?.toString() ?? 'Error';
      if (status === HttpStatus.FORBIDDEN) message = messages[lang].FORBIDDEN;
      if (status === HttpStatus.UNAUTHORIZED) message = messages[lang].UNAUTHORIZED;

      return {
        status,
        message,
        error,
        details: responseObj['details'],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: messages[lang].INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
    };
  }
}
