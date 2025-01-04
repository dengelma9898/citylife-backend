import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

@Injectable()
export class BusinessUsersService {
  public async getAll(): Promise<any[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'business_users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  public async getById(id: string): Promise<any> {
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
} 