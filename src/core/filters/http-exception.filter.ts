import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DateTimeUtils } from '../../utils/date-time.utils';

interface ExceptionResponse {
  message: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error('Unhandled Internal Server Error', exception);
    }
    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionResponse).message || exception.message
        : 'Internal server error';
    response.status(status).json({
      statusCode: status,
      timestamp: DateTimeUtils.getBerlinTime(),
      message,
    });
  }
}
