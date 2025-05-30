import { Injectable } from '@nestjs/common';
import { Preference } from './interfaces/preference.interface';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AppSettingsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  public async getAll(): Promise<Preference[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('app_settings').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      preferences: doc.data().preferences || [],
    }));
  }

  public async getById(id: string): Promise<Preference | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('app_settings').doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      preferences: doc.data()?.preferences || [],
    };
  }
}
