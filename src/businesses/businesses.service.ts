import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessStatus } from './interfaces/business.interface';
import { BusinessCustomerDto } from './dto/business-customer.dto';
import { BusinessCustomer } from './interfaces/business-customer.interface';
import { UserAdapterService } from '../users/services/user-adapter.service';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(private readonly userAdapter: UserAdapterService) {}

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
      name: doc.data().name,
      description: doc.data().description,
      iconName: doc.data().iconName,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    }));
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

  public async create(data: CreateBusinessDto): Promise<Business> {
    this.logger.debug('Creating new business');
    const db = getFirestore();
    
    const businessData: Omit<Business, 'id'> = {
      name: data.name,
      category: {
        name: data.category.name,
        description: data.category.description,
        iconName: data.category.iconName,
        createdAt: data.category.createdAt,
        updatedAt: data.category.updatedAt
      },
      description: data.description,
      contact: {
        email: data.contact.email,
        phoneNumber: data.contact.phoneNumber,
        instagram: data.contact.instagram,
        facebook: data.contact.facebook,
        tiktok: data.contact.tiktok,
        website: data.contact.website
      },
      address: {
        street: data.address.street,
        houseNumber: data.address.houseNumber,
        postalCode: data.address.postalCode,
        city: data.address.city,
        latitude: data.address.latitude,
        longitude: data.address.longitude
      },
      logoUrl: '',
      imageUrls: [],
      openingHours: data.openingHours,
      benefit: data.benefit,
      status: data.isAdmin ? BusinessStatus.ACTIVE : BusinessStatus.PENDING,
      customers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
      hasAccount: data.hasAccount
    };

    const docRef = await addDoc(collection(db, 'businesses'), businessData);
    
    return {
      id: docRef.id,
      ...businessData
    };
  }

  private async getCategory(id: string): Promise<BusinessCategory | null> {
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      name: docSnap.data().name,
      description: docSnap.data().description,
      iconName: docSnap.data().iconName,
      createdAt: docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt
    };
  }

  public async update(id: string, data: Partial<Business>): Promise<Business> {
    this.logger.debug(`Updating business ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business not found');
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Business;
  }

  public async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
    this.logger.debug(`Updating business ${id} status to ${status}`);
    return this.update(id, { status });
  }

  public async patch(id: string, data: Partial<Business>): Promise<Business> {
    this.logger.debug(`Patching business ${id} with data:`, data);
    const db = getFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      this.logger.error(`Business ${id} not found`);
      throw new NotFoundException('Business not found');
    }

    const currentData = docSnap.data() as Business;
    const patchedData = {
      ...currentData,
      ...data,
      updatedAt: new Date().toISOString()
    };

    this.logger.debug(`Updating business ${id} with patched data`);
    await updateDoc(docRef, patchedData);
    
    return patchedData;
  }

  public async addCustomerScan(businessId: string, scanData: BusinessCustomerDto): Promise<Business> {
    this.logger.debug(`Adding customer scan for business ${businessId}`);
    const business = await this.getById(businessId);
    
    if (!business) {
      this.logger.error(`Business ${businessId} not found`);
      throw new NotFoundException('Business not found');
    }

    const newCustomer: BusinessCustomer = {
      customerId: scanData.customerId,
      scannedAt: new Date().toISOString()
    };

    // Ensure customers is an array
    const currentCustomers = business.customers || [];
    const updatedCustomers = [...currentCustomers, newCustomer];

    const updatedBusiness = await this.patch(businessId, { 
      customers: updatedCustomers,
      updatedAt: new Date().toISOString()
    });

    await this.userAdapter.addBusinessToHistory(
      scanData.userId, 
      businessId, 
      updatedBusiness.name, 
      updatedBusiness.benefit
    );
    
    return updatedBusiness;
  }
} 