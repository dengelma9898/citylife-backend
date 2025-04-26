import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { Business, BusinessResponse, BusinessListResponse } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessStatus } from './interfaces/business.interface';
import { BusinessCustomerDto } from './dto/business-customer.dto';
import { BusinessCustomer, BusinessCustomerScans } from './interfaces/business-customer.interface';
import { UserAdapterService } from '../users/services/user-adapter.service';
import { BusinessCategoriesService } from '../business-categories/business-categories.service';
import { KeywordsService } from '../keywords/keywords.service';
import { EventsService } from '../events/events.service';
import { FirebaseService } from 'src/firebase/firebase.service';
interface BusinessStatusFilter {
  hasAccount: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    private readonly userAdapter: UserAdapterService,
    private readonly businessCategoriesService: BusinessCategoriesService,
    private readonly keywordsService: KeywordsService,
    private readonly eventsService: EventsService,
    private readonly firebaseService: FirebaseService
  ) {}

  public async getAll(): Promise<BusinessListResponse[]> {
    this.logger.debug('Getting all businesses');
    const db = this.firebaseService.getClientFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    
    const businesses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Business));

    // Kategorien und Keywords für alle Businesses laden
    const businessesWithDetails = await Promise.all(
      businesses.map(async (business) => {
        const category = await this.businessCategoriesService.getById(business.categoryId);
        const keywordNames = await this.getKeywordNames(business.keywordIds || []);

        return {
          ...business,
          category: {
            id: category?.id || '',
            name: category?.name || '',
            iconName: category?.iconName || ''
          },
          keywordNames
        } as BusinessListResponse;
      })
    );

    return businessesWithDetails;
  }

  public async getById(id: string): Promise<BusinessResponse | null> {
    this.logger.debug(`Getting business ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const business = {
      id: docSnap.id,
      ...docSnap.data()
    } as Business;

    // Kategorie und Keywords laden
    const category = await this.businessCategoriesService.getById(business.categoryId);
    const keywordNames = await this.getKeywordNames(business.keywordIds || []);

    // Events laden, wenn vorhanden
    let events;
    if (business.eventIds && business.eventIds.length > 0) {
      events = await this.eventsService.getByIds(business.eventIds);
    }

    return {
      ...business,
      category: {
        id: category?.id || '',
        name: category?.name || '',
        iconName: category?.iconName || ''
      },
      keywordNames,
      events
    } as BusinessResponse;
  }

  private async mapBusinessesToResponse(businesses: Business[]): Promise<BusinessResponse[]> {
    if (businesses.length === 0) return [];
    
    const categoryPromises = businesses.map(business => 
      this.businessCategoriesService.getById(business.categoryId)
    );
    const categories = await Promise.all(categoryPromises);
    
    const keywordPromises = businesses
      .filter(business => business.keywordIds && business.keywordIds.length > 0)
      .map(async business => {
        const keywordIds = business.keywordIds || [];
        const keywordPromises = keywordIds.map(id => this.keywordsService.getById(id));
        const keywords = await Promise.all(keywordPromises);
        return keywords
          .filter(keyword => keyword !== null)
          .map(keyword => ({ id: keyword.id, name: keyword.name }));
      });
    const keywordResults = await Promise.all(keywordPromises);
    
    const keywordMap = new Map<string, { id: string; name: string }[]>();
    businesses.forEach((business, index) => {
      if (business.keywordIds && business.keywordIds.length > 0) {
        keywordMap.set(business.id, keywordResults.shift() || []);
      }
    });
    
    return businesses.map((business, index) => {
      const category = categories[index];
      
      if (!category) {
        this.logger.warn(`Category with id ${business.categoryId} not found for business ${business.id}`);
      }
      
      const { keywordIds, ...businessWithoutKeywordIds } = business;
      
      return {
        ...businessWithoutKeywordIds,
        category: category || { id: business.categoryId, name: 'Unknown Category' },
        keywordIds: keywordIds || [],
        keywordNames: (keywordMap.get(business.id) || []).map(keyword => keyword.name)
      } as BusinessResponse;
    });
  }

  public async getAllCategories(): Promise<BusinessCategory[]> {
    this.logger.debug('Fetching all business categories from Firestore');
    const db = this.firebaseService.getClientFirestore();
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
    const db = this.firebaseService.getClientFirestore();
    const usersCol = collection(db, 'business_users');
    const snapshot = await getDocs(usersCol);
    this.logger.debug(`Found ${snapshot.docs.length} business users`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessUser));
  }

  public async create(data: CreateBusinessDto): Promise<BusinessResponse> {
    this.logger.debug('Creating new business');
    
    const category = await this.businessCategoriesService.getById(data.categoryId);
    if (!category) {
      throw new NotFoundException(`Business category with id ${data.categoryId} not found`);
    }
    
    if (data.keywordIds && data.keywordIds.length > 0) {
      const keywordPromises = data.keywordIds.map(id => this.keywordsService.getById(id));
      const keywords = await Promise.all(keywordPromises);
      const missingKeywords = keywords.findIndex(k => k === null);
      if (missingKeywords !== -1) {
        throw new NotFoundException(`Keyword with id ${data.keywordIds[missingKeywords]} not found`);
      }
    }
    
    const db = this.firebaseService.getClientFirestore();
    
    const businessData: Omit<Business, 'id'> = {
      name: data.name,
      categoryId: data.categoryId,
      keywordIds: data.keywordIds || [],
      description: data.description,
      contact: {
        email: data.contact.email || '',
        phoneNumber: data.contact.phoneNumber || '',
        instagram: data.contact.instagram || '',
        facebook: data.contact.facebook || '',
        tiktok: data.contact.tiktok || '',
        website: data.contact.website || ''
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
      openingHours: data.openingHours || {},
      benefit: data.benefit,
      previousBenefits: [],
      status: data.isAdmin ? BusinessStatus.ACTIVE : BusinessStatus.PENDING,
      customers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPromoted: data.isPromoted || false,
      isDeleted: false,
      hasAccount: data.hasAccount
    };

    const docRef = await addDoc(collection(db, 'businesses'), businessData);
    
    const business: Business = {
      id: docRef.id,
      ...businessData
    };
    
    const [businessResponse] = await this.mapBusinessesToResponse([business]);
    return businessResponse;
  }

  private async getCategory(id: string): Promise<BusinessCategory | null> {
    const db = this.firebaseService.getClientFirestore();
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

  public async update(id: string, data: Partial<Business>): Promise<BusinessResponse> {
    this.logger.debug(`Updating business ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'businesses', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business not found');
    }

    if (data.categoryId) {
      const category = await this.businessCategoriesService.getById(data.categoryId);
      if (!category) {
        throw new NotFoundException(`Business category with id ${data.categoryId} not found`);
      }
    }

    if (data.keywordIds && data.keywordIds.length > 0) {
      const keywordPromises = data.keywordIds.map(id => this.keywordsService.getById(id));
      const keywords = await Promise.all(keywordPromises);
      const missingKeywords = keywords.findIndex(k => k === null);
      if (missingKeywords !== -1) {
        throw new NotFoundException(`Keyword with id ${data.keywordIds[missingKeywords]} not found`);
      }
    }

    const currentBusiness = docSnap.data() as Business;
    const updateData: Partial<Business> = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Wenn sich der Benefit ändert, füge den alten Benefit zu previousBenefits hinzu
    if (data.benefit && data.benefit !== currentBusiness.benefit) {
      const previousBenefits = currentBusiness.previousBenefits || [];
      if (!previousBenefits.includes(currentBusiness.benefit)) {
        updateData.previousBenefits = [...previousBenefits, currentBusiness.benefit];
      }
    } else if (!currentBusiness.previousBenefits) {
      // Wenn previousBenefits noch nicht existiert, initialisiere es als leeres Array
      updateData.previousBenefits = [];
    }

    await updateDoc(docRef, updateData);
    
    const businessResponse = await this.getById(id);
    if (!businessResponse) {
      throw new NotFoundException(`Business with id ${id} not found after update`);
    }
    return businessResponse;
  }

  public async updateStatus(id: string, status: BusinessStatus): Promise<BusinessResponse> {
    return this.update(id, { status });
  }

  public async updateHasAccount(id: string, hasAccount: boolean): Promise<BusinessResponse> {
    return this.update(id, { hasAccount });
  }

  public async patch(id: string, data: Partial<Business>): Promise<BusinessResponse> {
    this.logger.debug(`Patching business ${id}`);
    return this.update(id, data);
  }

  public async addCustomerScan(businessId: string, scanData: BusinessCustomerDto): Promise<BusinessResponse> {
    this.logger.debug(`Adding customer scan to business ${businessId}`);
    
    const business = await this.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'businesses', businessId);
    const docSnap = await getDoc(docRef);
    const businessData = docSnap.data() as Business;
    
    const customers = businessData.customers || [];
  
    const newCustomer: BusinessCustomer = {
      customerId: scanData.customerId,
      scannedAt: new Date().toISOString(),
      benefit: businessData.benefit,
      price: scanData.price || null,
      numberOfPeople: scanData.numberOfPeople || null,
      additionalInfo: scanData.additionalInfo || null
    }

    console.log('newCustomer', newCustomer);

    customers.push(newCustomer);

    await updateDoc(docRef, { 
      customers,
      updatedAt: new Date().toISOString()
    });
    
    const updatedBusiness = await this.getById(businessId);
    if (!updatedBusiness) {
      throw new NotFoundException(`Business with id ${businessId} not found after scan update`);
    }
    return updatedBusiness;
  }

  /**
   * Holt alle Businesses mit bestimmtem Status und hasAccount-Wert
   */
  public async getBusinessesByStatus(filter: BusinessStatusFilter): Promise<BusinessResponse[]> {
    this.logger.debug(`Getting businesses with status ${filter.status} and hasAccount ${filter.hasAccount}`);
    
    const businesses = await this.getAll();
    
    return businesses.filter(business => 
      business.hasAccount === filter.hasAccount && 
      business.status === filter.status
    );
  }

  private async getKeywordNames(keywordIds: string[]): Promise<string[]> {
    const keywordPromises = keywordIds.map(id => this.keywordsService.getById(id));
    const keywords = await Promise.all(keywordPromises);
    return keywords
      .filter(keyword => keyword !== null)
      .map(keyword => keyword.name);
  }

  public async getAllCustomerScans(): Promise<BusinessCustomerScans[]> {
    this.logger.debug('Getting all customer scans from all businesses');
    const db = this.firebaseService.getClientFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    
    const businessScans: BusinessCustomerScans[] = [];
    
    for (const businessDoc of snapshot.docs) {
      const businessData = businessDoc.data() as Business;
      const customers = businessData.customers || [];
      
      if (customers.length > 0) {
        businessScans.push({
          businessName: businessData.name,
          scans: customers.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
        });
      }
    }
    
    // Sort businesses by most recent scan
    return businessScans.sort((a, b) => {
      const aLatestScan = new Date(a.scans[0].scannedAt).getTime();
      const bLatestScan = new Date(b.scans[0].scannedAt).getTime();
      return bLatestScan - aLatestScan;
    });
  }
} 