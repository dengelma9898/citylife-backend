import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException('No authorization header found');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      this.logger.warn('No token found in authorization header');
      throw new UnauthorizedException('No token found in authorization header');
    }

    try {
      const decodedToken = await this.firebaseService.getAuth().verifyIdToken(token);
      request.user = decodedToken;
      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
