import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

@Injectable()
export class BusinessCategoriesService {
  public async getAll(): Promise<any[]> {
    const db = getFirestore();
    const categoriesCol = collection(db, 'business_categories');
    const snapshot = await getDocs(categoriesCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  public async getById(id: string): Promise<any> {
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
} 