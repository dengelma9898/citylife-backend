import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class TimezoneInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.convertSpecificDatesToBerlinTime(data))
    );
  }

  private convertSpecificDatesToBerlinTime(data: any): any {
    if (!data) return data;

    // Wenn es ein Array ist, rekursiv für jedes Element aufrufen
    if (Array.isArray(data)) {
      return data.map(item => this.convertSpecificDatesToBerlinTime(item));
    }

    // Wenn es ein Objekt ist, rekursiv für jede Property aufrufen
    if (typeof data === 'object') {
      const result: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = data[key];
          
          // Nur createdAt und updatedAt Felder konvertieren
          if ((key === 'createdAt' || key === 'updatedAt') && 
              (this.isISODateString(value) || value instanceof Date)) {
            result[key] = DateTimeUtils.convertUTCToBerlinTime(value);
          } else {
            result[key] = this.convertSpecificDatesToBerlinTime(value);
          }
        }
      }
      return result;
    }

    return data;
  }

  private isISODateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value);
  }
} 