import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  public async onModuleInit(): Promise<void> {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  public getFirestore(): FirebaseFirestore.Firestore {
    return admin.firestore();
  }

  public getAuth(): admin.auth.Auth {
    return admin.auth();
  }
} 