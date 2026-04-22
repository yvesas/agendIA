import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

const INTERNAL_SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR;

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

const STATUS_REASONS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url?: string }>();
    const response = ctx.getResponse<unknown>();

    const { statusCode, message } = this.resolveStatusAndMessage(exception);
    const error = STATUS_REASONS[statusCode] ?? 'Error';

    if (statusCode >= INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled exception on ${request.url ?? 'unknown path'}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url ?? '',
    };

    httpAdapter.reply(response, body, statusCode);
  }

  private resolveStatusAndMessage(exception: unknown): {
    statusCode: number;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      const message = this.extractMessage(response, exception.message);
      return { statusCode, message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private extractMessage(response: unknown, fallback: string): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (this.isObjectWithMessage(response)) {
      return response.message;
    }

    return fallback;
  }

  private isObjectWithMessage(value: unknown): value is { message: string | string[] } {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string') {
      return true;
    }

    return Array.isArray(message) && message.every((item) => typeof item === 'string');
  }
}
