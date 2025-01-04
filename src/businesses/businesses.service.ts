import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

@Injectable()
export class BusinessesService {
  public async getAll(): Promise<any[]> {
    const db = getFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  public async getById(id: string): Promise<any> {
    const db = getFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
} 