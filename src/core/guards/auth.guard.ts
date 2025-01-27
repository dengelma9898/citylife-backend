import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      this.logger.warn('No authorization header present');
      throw new UnauthorizedException('No authorization header present');
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer') {
      this.logger.warn(`Invalid authorization type: ${type}`);
      throw new UnauthorizedException('Invalid authorization type. Expected Bearer token');
    }

    if (!token) {
      this.logger.warn('No token provided');
      throw new UnauthorizedException('No token provided');
    }

    this.logger.debug(`Received valid bearer token: ${token}`);
    return true;
  }
} 