import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { BusinessCategory } from './interfaces/business-category.interface';

@Injectable()
export class BusinessCategoriesService {
  public async getAll(): Promise<BusinessCategory[]> {
    const db = getFirestore();
    const categoriesCol = collection(db, 'business_categories');
    const snapshot = await getDocs(categoriesCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      description: doc.data().description,
      iconName: doc.data().iconName,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
    }));
  }

  public async getById(id: string): Promise<BusinessCategory | null> {
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      iconName: data.iconName,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
} 