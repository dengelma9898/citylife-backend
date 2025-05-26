import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Preference } from './interfaces/preference.interface';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AppSettingsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  public async getAll(): Promise<Preference[]> {
    const db = this.firebaseService.getClientFirestore();
    const settingsCol = collection(db, 'app_settings');
    const snapshot = await getDocs(settingsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      preferences: doc.data().preferences || [],
    }));
  }

  public async getById(id: string): Promise<Preference | null> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'app_settings', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      preferences: docSnap.data().preferences || [],
    };
  }
}
