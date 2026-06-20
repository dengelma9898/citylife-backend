import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp as initializeAdminApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private adminApp: App;

  constructor(private configService: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    try {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const storageBucket = this.configService.get<string>('FIREBASE_STORAGE_BUCKET');
      const serviceAccountPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      if (!serviceAccountPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      }
      const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));
      this.adminApp = initializeAdminApp({
        credential: cert(serviceAccount),
        projectId,
        storageBucket,
      });
      const firestoreInstance = getFirestore(this.adminApp);
      firestoreInstance.settings({
        databaseId: this.configService.get<string>('FIREBASE_STORAGE_ID'),
      });
      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  public getFirestore(): Firestore {
    return getFirestore(this.adminApp);
  }

  public getAuth(): Auth {
    return getAuth(this.adminApp);
  }
}
