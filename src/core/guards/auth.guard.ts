import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
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

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Prüfe Firebase Audience
      if (decodedToken.aud !== 'citylife-fe75a') {
        this.logger.warn(`Invalid token audience: ${decodedToken.aud}`);
        throw new UnauthorizedException('Invalid token audience');
      }

      // Prüfe Firebase Property
      if (!decodedToken.firebase) {
        this.logger.warn('Token is not a Firebase token');
        throw new UnauthorizedException('Invalid token type');
      }

      this.logger.debug(`Valid token for user: ${decodedToken.uid}`);
      return true;

    } catch (error) {
      this.logger.warn('Token verification failed:', error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
} 