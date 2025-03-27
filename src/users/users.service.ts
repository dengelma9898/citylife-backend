import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from 'firebase/firestore';
import { UserProfile } from './interfaces/user-profile.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from './enums/user-type.enum';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { EventsService } from '../events/events.service';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => BusinessesService))
    private readonly businessesService: BusinessesService
  ) {}

  public async getAll(): Promise<UserProfile[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  }

  public async getBusinessUsersNeedsReview(): Promise<(BusinessUser & { businessNames: string[] })[]> {
    this.logger.debug('Getting business users that need review');
    const db = getFirestore();
    const businessUsersCol = collection(db, 'business_users');
    const q = query(businessUsersCol, where('needsReview', '==', true), where('isDeleted', '==', false));
    const snapshot = await getDocs(q);
    
    const businessUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessUser));

    // Für jeden BusinessUser die Business-Namen laden
    const businessUsersWithNames = await Promise.all(
      businessUsers.map(async (user) => {
        const businessNames = await Promise.all(
          user.businessIds.map(async (businessId) => {
            const business = await this.businessesService.getById(businessId);
            return business?.name || 'Unbekanntes Business';
          })
        );

        return {
          ...user,
          businessNames
        };
      })
    );

    return businessUsersWithNames;
  }

  public async getBusinessUsersNeedsReviewCount(): Promise<number> {
    this.logger.debug('Getting count of business users that need review');
    const db = getFirestore();
    const businessUsersCol = collection(db, 'business_users');
    const snapshot = await getDocs(businessUsersCol);
    
    return snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.needsReview === true && !data.isDeleted;
    }).length;
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

  public async createBusinessUser(data: CreateBusinessUserDto): Promise<BusinessUser> {
    this.logger.debug('Creating business user');
    const db = getFirestore();
    
    const userData: Omit<BusinessUser, 'id'> = {
      email: data.email,
      businessIds: [data.businessId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
      needsReview: data.needsReview
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

  public async toggleFavoriteEvent(userId: string, eventId: string): Promise<boolean> {
    this.logger.debug(`Toggling favorite event ${eventId} for user ${userId}`);
    const userProfile = await this.getUserProfile(userId);
    
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    const favoriteEventIds = userProfile.favoriteEventIds || [];
    let updatedFavorites: string[];
    let isAdded: boolean;
    
    if (favoriteEventIds.includes(eventId)) {
      // Remove from favorites
      updatedFavorites = favoriteEventIds.filter(id => id !== eventId);
      isAdded = false;
    } else {
      // Add to favorites
      updatedFavorites = [...favoriteEventIds, eventId];
      isAdded = true;
    }
    
    // Update the user profile
    await this.update(userId, { favoriteEventIds: updatedFavorites });
    
    // Update the event's favorite count
    try {
      await this.eventsService.updateFavoriteCount(eventId, isAdded);
    } catch (error) {
      this.logger.error(`Error updating favorite count: ${error.message}`);
      // We don't throw here to prevent affecting the user experience
      // The user's favorite list was already updated
    }
    
    return isAdded;
  }

  public async toggleFavoriteBusiness(userId: string, businessId: string): Promise<boolean> {
    this.logger.debug(`Toggling favorite business ${businessId} for user ${userId}`);
    const userProfile = await this.getUserProfile(userId);
    
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    const favoriteBusinessIds = userProfile.favoriteBusinessIds || [];
    let updatedFavorites: string[];
    let isAdded: boolean;
    
    if (favoriteBusinessIds.includes(businessId)) {
      // Remove from favorites
      updatedFavorites = favoriteBusinessIds.filter(id => id !== businessId);
      isAdded = false;
    } else {
      // Add to favorites
      updatedFavorites = [...favoriteBusinessIds, businessId];
      isAdded = true;
    }
    
    await this.update(userId, { favoriteBusinessIds: updatedFavorites });
    return isAdded;
  }

  /**
   * Fügt eine Business-ID zur Liste der businessIds eines BusinessUsers hinzu
   * 
   * @param userId - Die ID des BusinessUsers
   * @param businessId - Die ID des Businesses, das hinzugefügt werden soll
   * @returns Der aktualisierte BusinessUser
   */
  public async addBusinessToUser(userId: string, businessId: string): Promise<BusinessUser> {
    this.logger.debug(`Adding business ${businessId} to user ${userId}`);
    const businessUser = await this.getBusinessUser(userId);
    
    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }
    
    // Überprüfen, ob die Business-ID bereits vorhanden ist
    if (businessUser.businessIds.includes(businessId)) {
      this.logger.debug(`Business ${businessId} already in user's list`);
      return businessUser;
    }
    
    // Business-ID hinzufügen
    const updatedBusinessIds = [...businessUser.businessIds, businessId];
    
    // BusinessUser aktualisieren
    return this.updateBusinessUser(userId, { businessIds: updatedBusinessIds });
  }

  /**
   * Fügt eine Event-ID zur Liste der eventIds eines BusinessUsers hinzu
   * 
   * @param userId - Die ID des BusinessUsers
   * @param eventId - Die ID des Events, das hinzugefügt werden soll
   * @returns Der aktualisierte BusinessUser
   */
  public async addEventToUser(userId: string, eventId: string): Promise<BusinessUser> {
    this.logger.debug(`Adding event ${eventId} to user ${userId}`);
    const businessUser = await this.getBusinessUser(userId);
    
    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }
    
    // Überprüfen, ob die Event-ID bereits vorhanden ist
    const currentEventIds = businessUser.eventIds || [];
    if (currentEventIds.includes(eventId)) {
      this.logger.debug(`Event ${eventId} already in user's list`);
      return businessUser;
    }
    
    // Event-ID hinzufügen
    const updatedEventIds = [...currentEventIds, eventId];
    
    // BusinessUser aktualisieren
    return this.updateBusinessUser(userId, { eventIds: updatedEventIds });
  }
} 