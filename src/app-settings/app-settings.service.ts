import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

@Injectable()
export class AppSettingsService {
  public async getAll(): Promise<any[]> {
    const db = getFirestore();
    const settingsCol = collection(db, 'app_settings');
    const snapshot = await getDocs(settingsCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  public async getById(id: string): Promise<any> {
    const db = getFirestore();
    const docRef = doc(db, 'app_settings', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
} 