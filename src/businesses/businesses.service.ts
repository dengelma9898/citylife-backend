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
import { OpeningHourInterval } from './interfaces/business.interface';
import { DateTimeUtils } from '../utils/date-time.utils';

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

  private async loadCategories(categoryId: string | undefined, categoryIds: string[]): Promise<Array<{
    id: string;
    name: string;
    iconName: string;
  }>> {
    if (!categoryId && !categoryIds) {
      this.logger.warn('No categoryIds provided');
      return [];
    }

    if (categoryId && (!categoryIds || categoryIds.length === 0)) {
      categoryIds = [categoryId];
    }

    const categoryPromises = categoryIds.map(id => 
      this.businessCategoriesService.getById(id)
    );
    const categories = await Promise.all(categoryPromises);

    return categories
      .filter(category => category !== null)
      .map(category => ({
        id: category.id,
        name: category.name,
        iconName: category.iconName
      }));
  }

  private getMainCategory(categories: Array<{
    id: string;
    name: string;
    iconName: string;
  }>): {
    id: string;
    name: string;
    iconName: string;
  } {
    if (categories.length === 0) {
      return { id: '', name: 'Unknown Category', iconName: '' };
    }
    return categories[0];
  }

  public async getAll(): Promise<BusinessListResponse[]> {
    this.logger.debug('Getting all businesses');
    const db = this.firebaseService.getClientFirestore();
    const businessesCol = collection(db, 'businesses');
    const snapshot = await getDocs(businessesCol);
    
    const businesses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Business));
    console.log('businesses', businesses);
    // Kategorien und Keywords für alle Businesses laden
    const businessesWithDetails = await Promise.all(
      businesses.map(async (business) => {
        const categories = await this.loadCategories(business.categoryId, business.categoryIds);
        const keywordNames = await this.getKeywordNames(business.keywordIds || []);
        const categoryIds = business.categoryIds || [business.categoryId];
        business.categoryId = undefined;
        return {
          ...business,
          categories,
          categoryIds,
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

    const categories = await this.loadCategories(business.categoryId, business.categoryIds);
    const mainCategory = this.getMainCategory(categories);
    const keywordNames = await this.getKeywordNames(business.keywordIds || []);
    const categoryIds = business.categoryIds || [business.categoryId];
    // Events laden, wenn vorhanden
    let events;
    if (business.eventIds && business.eventIds.length > 0) {
      events = await this.eventsService.getByIds(business.eventIds);
    }

    // --- Öffnungszeiten-Logik ---
    let detailedOpeningHours: Record<string, OpeningHourInterval[]> | undefined = business.detailedOpeningHours;
    if (!detailedOpeningHours || Object.keys(detailedOpeningHours).length === 0) {
      // Fallback: aus openingHours generieren
      detailedOpeningHours = {};
      if (business.openingHours) {
        for (const [day, value] of Object.entries(business.openingHours)) {
          // Beispiel: "08:00 - 12:00; 14:00 - 22:00"
          const intervals = value.split(';').map(interval => {
            const [start, end] = interval.split('-').map(str => str.trim());
            return { from: start, to: end };
          }).filter(interval => interval.from && interval.to);
          detailedOpeningHours[day] = intervals;
        }
      }
    }
    business.categoryId = undefined;
    return {
      ...business,
      categories,
      categoryIds,
      keywordNames,
      events,
      detailedOpeningHours
    } as BusinessResponse;
  }

  private async mapBusinessesToResponse(businesses: Business[]): Promise<BusinessResponse[]> {
    if (businesses.length === 0) return [];
    
    // Lade alle Kategorien für alle Businesses
    const categoriesPromises = businesses.map(business => 
      this.loadCategories(business.categoryId, business.categoryIds)
    );
    const categoriesResults = await Promise.all(categoriesPromises);
    
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
      const categories = categoriesResults[index];
      const mainCategory = this.getMainCategory(categories);
      
      if (categories.length === 0) {
        this.logger.warn(`No categories found for business ${business.id}`);
      }
      
      const { keywordIds, ...businessWithoutKeywordIds } = business;
      
      return {
        ...businessWithoutKeywordIds,
        category: mainCategory,
        categories,
        categoryIds: business.categoryIds,
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
    
    // Überprüfe, ob die erste Kategorie existiert (wird für die Hauptkategorie verwendet)
    const mainCategory = await this.businessCategoriesService.getById(data.categoryIds[0]);
    if (!mainCategory) {
      throw new NotFoundException(`Business category with id ${data.categoryIds[0]} not found`);
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
      categoryIds: data.categoryIds,
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
      detailedOpeningHours: data.detailedOpeningHours || {},
      benefit: data.benefit,
      previousBenefits: [],
      status: data.isAdmin ? BusinessStatus.ACTIVE : BusinessStatus.PENDING,
      customers: [],
      createdAt: DateTimeUtils.getUTCTime(),
      updatedAt: DateTimeUtils.getUTCTime(),
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
      updatedAt: DateTimeUtils.getUTCTime()
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
      scannedAt: DateTimeUtils.getUTCTime(),
      benefit: businessData.benefit,
      price: scanData.price || null,
      numberOfPeople: scanData.numberOfPeople || null,
      additionalInfo: scanData.additionalInfo || null
    }

    console.log('newCustomer', newCustomer);

    customers.push(newCustomer);

    await updateDoc(docRef, { 
      customers,
      updatedAt: DateTimeUtils.getUTCTime()
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
    console.log('businessScans', businessScans);
    // Sort businesses by most recent scan
    return businessScans.sort((a, b) => {
      const aLatestScan = new Date(a.scans[0].scannedAt).getTime();
      const bLatestScan = new Date(b.scans[0].scannedAt).getTime();
      return bLatestScan - aLatestScan;
    });
  }
} 