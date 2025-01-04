import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Business } from './interfaces/business.interface';

@Injectable()
export class BusinessesService {
  public async getAll(): Promise<Business[]> {
    const db = getFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      category: doc.data().category,
      contact: doc.data().contact,
      address: doc.data().address,
      description: doc.data().description,
      logo: doc.data().logo,
      photos: doc.data().photos || [],
      openingHours: doc.data().openingHours || {},
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
      isDeleted: doc.data().isDeleted || false,
    }));
  }

  public async getById(id: string): Promise<Business | null> {
    const db = getFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      category: data.category,
      contact: data.contact,
      address: data.address,
      description: data.description,
      logo: data.logo,
      photos: data.photos || [],
      openingHours: data.openingHours || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted || false,
    };
  }
} 