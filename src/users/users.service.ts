import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from './interfaces/user-profile.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CitiesService } from '../cities/cities.service';
import { City } from '../cities/interfaces/city.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from './enums/user-type.enum';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  public anonymousCityId = 'bbc845b5-9685-40a1-8809-beba589fd4eb';


  constructor(
    private readonly citiesService: CitiesService,
  ) {}

  public async getAll(): Promise<UserProfile[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  }

  public async getById(id: string): Promise<UserProfile | BusinessUser | null> {
    const userProfile = await this.getUserProfile(id);
    if (userProfile) return userProfile;

    const businessUser = await this.getBusinessUser(id);
    if (businessUser) return businessUser;

    this.logger.warn(`User ${id} not found in any collection`);
    return null;
  }

  public async getUserProfile(id: string): Promise<UserProfile | null> {
    this.logger.debug(`Getting user profile for id: ${id}`);
    const db = getFirestore();
    const userDocRef = doc(db, 'users', id);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      this.logger.debug('Found user in users collection');
      return userDocSnap.data() as UserProfile;
    }

    return null;
  }

  public async getBusinessUser(id: string): Promise<BusinessUser | null> {
    this.logger.debug(`Getting business user for id: ${id}`);
    const db = getFirestore();
    const businessUserDocRef = doc(db, 'business_users', id);
    const businessUserDocSnap = await getDoc(businessUserDocRef);
    
    if (businessUserDocSnap.exists()) {
      this.logger.debug('Found user in business_users collection');
      return {
        id: businessUserDocSnap.id,
        ...businessUserDocSnap.data()
      } as BusinessUser;
    }

    return null;
  }

  public async createUserProfile(id: string, profile: CreateUserProfileDto): Promise<UserProfile> {
    this.logger.debug(`Creating user profile for id: ${id}`);
    const userProfile: UserProfile = {
      ...profile,
      userType: UserType.USER,
      managementId: uuidv4(),
      customerId: `NSP-${id}`,
      memberSince: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
      businessHistory: [],
    };
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    await setDoc(docRef, userProfile);

    return userProfile;
  }

  public async update(id: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('User not found');
    }

    await updateDoc(docRef, profile);
    
    const updatedDoc = await getDoc(docRef);
    return updatedDoc.data() as UserProfile;
  }

  public async delete(id: string): Promise<void> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('User not found');
    }

    await deleteDoc(docRef);
  }

  public async getCurrentCity(userId: string): Promise<City> {
    this.logger.debug(`Getting current city for userId: ${userId}`);

    const user = await this.getUserProfile(userId);
    
    if (user?.currentCityId) {
      const city = await this.citiesService.getById(user.currentCityId);
      if (city) {
        return city;
      }
      this.logger.warn(`Saved city ${user.currentCityId} not found, falling back to default`);
    }

    const defaultCity = await this.citiesService.getById(this.anonymousCityId);
    if (!defaultCity) {
      throw new NotFoundException('Default city not found');
    }
    return defaultCity;
  }

  public async setCurrentCity(userId: string, cityId: string): Promise<City> {
    this.logger.debug(`Setting current city ${cityId} for user ${userId}`);
    
    const user = await this.getById(userId);
    if (!user) {
      this.anonymousCityId = cityId;
      this.logger.warn(`User ${userId} not found, using anonymous city ${cityId}`);
    }

    const city = await this.citiesService.getById(cityId);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    if (user) {
      await this.update(userId, { currentCityId: cityId });
    }
    return city;
  }

  public async createBusinessUser(data: CreateBusinessUserDto): Promise<BusinessUser> {
    this.logger.debug('Creating business user');
    const db = getFirestore();
    
    const userData: Omit<BusinessUser, 'id'> = {
      email: data.email,
      businessIds: [data.businessId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    const docRef = doc(db, 'business_users', data.userId);
    await setDoc(docRef, userData);
    
    return {
      id: data.userId,
      ...userData
    };
  }

  public async updateBusinessUser(id: string, data: Partial<BusinessUser>): Promise<BusinessUser> {
    this.logger.debug(`Updating business user ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business user not found');
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
    const businessUser = await this.getBusinessUser(id);
    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }
    return businessUser;
  }

  public async deleteBusinessUser(id: string): Promise<void> {
    this.logger.debug(`Deleting business user ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business user not found');
    }

    await deleteDoc(docRef);
  }
} 