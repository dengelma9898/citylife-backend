import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private configService: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    try {
      const firebaseConfig = {
        apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
        authDomain: this.configService.get<string>('FIREBASE_AUTH_DOMAIN'),
        projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.configService.get<string>('FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.configService.get<string>('FIREBASE_APP_ID'),
      };

      // Initialize Firebase Admin SDK
      const serviceAccountPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');

      if (!serviceAccountPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      }

      const serviceAccount = require(path.resolve(process.cwd(), serviceAccountPath));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
      });

      admin
        .firestore()
        .settings({ databaseId: this.configService.get<string>('FIREBASE_STORAGE_ID') });

      // Initialize Firebase App
      initializeApp(firebaseConfig);

      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Firebase:', error);
      throw error;
    }
  }

  public getFirestore(): FirebaseFirestore.Firestore {
    return admin.firestore();
  }

  public getAuth(): admin.auth.Auth {
    return admin.auth();
  }

  public getClientFirestore(): Firestore {
    if (process.env.NODE_ENV === 'prd') {
      this.logger.log(
        'Using Firestore database ID:',
        this.configService.get<string>('FIREBASE_STORAGE_ID'),
      );
      return getFirestore(this.configService.get<string>('FIREBASE_STORAGE_ID')!);
    }
    return getFirestore();
  }
}
