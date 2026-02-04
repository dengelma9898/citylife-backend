import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class FirestoreTokenInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FirestoreTokenInterceptor.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (token) {
      try {
        const db = this.firebaseService.getFirestore();
        request.firestore = db;
        this.logger.debug('Firestore client initialized with admin SDK');
      } catch (error) {
        this.logger.error('Error initializing Firestore client:', error);
      }
    } else {
      this.logger.warn('No auth token found in request');
    }

    return next.handle();
  }
}
