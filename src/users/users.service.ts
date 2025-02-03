import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from './interfaces/user-profile.interface';
import { CitiesService } from '../cities/cities.service';
import { City } from '../cities/interfaces/city.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly DEFAULT_CITY_ID = 'bbc845b5-9685-40a1-8809-beba589fd4eb';

  constructor(
    private readonly citiesService: CitiesService,
  ) {}

  public async getAll(): Promise<UserProfile[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfile));
  }

  public async getById(id: string): Promise<UserProfile | null> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as UserProfile;
  }

  public async create(id: string, profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    await setDoc(docRef, profile);
    
    return {
      id,
      ...profile
    };
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
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as UserProfile;
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

    const user = await this.getById(userId);
    
    if (user?.currentCityId) {
      const city = await this.citiesService.getById(user.currentCityId);
      if (city) {
        return city;
      }
      this.logger.warn(`Saved city ${user.currentCityId} not found, falling back to default`);
    }

    const defaultCity = await this.citiesService.getById(this.DEFAULT_CITY_ID);
    if (!defaultCity) {
      throw new NotFoundException('Default city not found');
    }
    return defaultCity;
  }

  public async setCurrentCity(userId: string, cityId: string): Promise<City> {
    this.logger.debug(`Setting current city ${cityId} for user ${userId}`);
    
    const user = await this.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const city = await this.citiesService.getById(cityId);
    if (!city) {
      throw new NotFoundException('City not found');
    }

    await this.update(userId, { currentCityId: cityId });
    return city;
  }
} 