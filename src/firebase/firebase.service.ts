import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
@Injectable()
export class FirebaseService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    const firebaseConfig = {
      apiKey: this.configService.get<string>('FIREBASE_API_KEY'),
      authDomain: this.configService.get<string>('FIREBASE_AUTH_DOMAIN'),
      projectId: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      storageBucket: this.configService.get<string>('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: this.configService.get<string>('FIREBASE_MESSAGING_SENDER_ID'),
      appId: this.configService.get<string>('FIREBASE_APP_ID'),
    };

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    });
    // Initialize Firebase App
    initializeApp(firebaseConfig);
  }

  public getFirestore(): FirebaseFirestore.Firestore {
      return admin.firestore();
  }

  public getAuth(): admin.auth.Auth {
    return admin.auth();
  }

  public getClientFirestore(): Firestore {
    if (process.env.NODE_ENV === 'production') {
      return getFirestore(this.configService.get<string>('FIREBASE_STORAGE_ID')!);
    }
    return getFirestore();
  }
} 