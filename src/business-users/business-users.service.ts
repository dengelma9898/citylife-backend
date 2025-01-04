import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { BusinessUser } from './interfaces/business-user.interface';

@Injectable()
export class BusinessUsersService {
  public async getAll(): Promise<BusinessUser[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'business_users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      businessIds: doc.data().businessIds || [],
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
      isDeleted: doc.data().isDeleted || false,
    }));
  }

  public async getById(id: string): Promise<BusinessUser | null> {
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email,
      businessIds: data.businessIds || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted || false,
    };
  }
} 