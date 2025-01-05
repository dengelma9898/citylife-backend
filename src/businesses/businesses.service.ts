import { Injectable, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';

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

  // Business Categories methods
  public async getAllCategories(): Promise<BusinessCategory[]> {
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

  // Business Users methods
  public async getAllBusinessUsers(): Promise<BusinessUser[]> {
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
} 