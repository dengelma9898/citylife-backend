import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    
    this.logger.debug(`Received auth token: ${token}`);
    
    // In der ersten Iteration geben wir immer true zurück
    return true;
  }
} 