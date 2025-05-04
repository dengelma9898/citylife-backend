import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateTimeUtils } from 'src/utils/date-time.utils';

interface Response<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  public intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((responseData: T) => ({
        data: responseData,
        timestamp: DateTimeUtils.getBerlinTime(),
      })),
    );
  }
} 