import { Injectable, Logger } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  public async getAll(): Promise<Business[]> {
    this.logger.debug('Fetching all businesses from Firestore');
    const db = getFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    this.logger.debug(`Found ${snapshot.docs.length} businesses`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Business));
  }

  public async getById(id: string): Promise<Business | null> {
    this.logger.debug(`Fetching business with id ${id} from Firestore`);
    const db = getFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      this.logger.debug(`Business with id ${id} not found`);
      return null;
    }

    this.logger.debug(`Found business with id ${id}`);
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Business;
  }

  public async getAllCategories(): Promise<BusinessCategory[]> {
    this.logger.debug('Fetching all business categories from Firestore');
    const db = getFirestore();
    const categoriesCol = collection(db, 'business_categories');
    const snapshot = await getDocs(categoriesCol);
    this.logger.debug(`Found ${snapshot.docs.length} categories`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessCategory));
  }

  public async getAllBusinessUsers(): Promise<BusinessUser[]> {
    this.logger.debug('Fetching all business users from Firestore');
    const db = getFirestore();
    const usersCol = collection(db, 'business_users');
    const snapshot = await getDocs(usersCol);
    this.logger.debug(`Found ${snapshot.docs.length} business users`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessUser));
  }
} 