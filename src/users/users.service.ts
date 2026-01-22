import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { UserProfile, FcmToken } from './interfaces/user-profile.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from './enums/user-type.enum';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { EventsService } from '../events/events.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import { FirebaseService } from '../firebase/firebase.service';
import { DateTimeUtils } from '../utils/date-time.utils';
import { BusinessStatus } from '../businesses/interfaces/business.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly usersCollection = 'users';
  private readonly businessUsersCollection = 'business_users';

  constructor(
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => BusinessesService))
    private readonly businessesService: BusinessesService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  public async getAll(): Promise<UserProfile[]> {
    try {
      this.logger.debug('Getting all users');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.usersCollection).get();
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      this.logger.error(`Error getting all users: ${error.message}`);
      throw error;
    }
  }

  public async getAllUserProfilesWithIds(): Promise<{ id: string; profile: UserProfile }[]> {
    try {
      this.logger.debug('Getting all users with IDs');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.usersCollection).get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        profile: doc.data() as UserProfile,
      }));
    } catch (error) {
      this.logger.error(`Error getting all users with IDs: ${error.message}`);
      throw error;
    }
  }

  public async getBusinessUsersNeedsReview(): Promise<
    (BusinessUser & { businessNames: string[] })[]
  > {
    try {
      this.logger.debug('Getting business users that need review');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.businessUsersCollection)
        .where('needsReview', '==', true)
        .where('isDeleted', '==', false)
        .get();

      const businessUsers = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as BusinessUser,
      );

      const businessUsersWithNames = await Promise.all(
        businessUsers.map(async user => {
          const businessNames = await Promise.all(
            user.businessIds.map(async businessId => {
              const business = await this.businessesService.getById(businessId);
              return business?.name || 'Unbekanntes Business';
            }),
          );

          return {
            ...user,
            businessNames,
          };
        }),
      );

      return businessUsersWithNames;
    } catch (error) {
      this.logger.error(`Error getting business users that need review: ${error.message}`);
      throw error;
    }
  }

  public async getBusinessUsersNeedsReviewCount(): Promise<number> {
    try {
      this.logger.debug('Getting count of business users that need review');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.businessUsersCollection)
        .where('needsReview', '==', true)
        .where('isDeleted', '==', false)
        .get();

      return snapshot.docs.length;
    } catch (error) {
      this.logger.error(`Error getting count of business users that need review: ${error.message}`);
      throw error;
    }
  }

  public async getById(id: string): Promise<UserProfile | BusinessUser | null> {
    try {
      const userProfile = await this.getUserProfile(id);
      if (userProfile) return userProfile;

      const businessUser = await this.getBusinessUser(id);
      if (businessUser) return businessUser;

      this.logger.warn(`User ${id} not found in any collection`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting user by id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async getUserProfile(id: string): Promise<UserProfile | null> {
    try {
      this.logger.debug(`Getting user profile for id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.usersCollection).doc(id).get();

      if (doc.exists) {
        this.logger.debug('Found user in users collection');
        return doc.data() as UserProfile;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting user profile for id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async getUserProfileByCustomerId(
    customerId: string,
  ): Promise<{ id: string; profile: UserProfile } | null> {
    try {
      this.logger.debug(`Getting user profile for customerId: ${customerId}`);
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.usersCollection)
        .where('customerId', '==', customerId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        this.logger.debug(`No user found with customerId: ${customerId}`);
        return null;
      }

      const doc = snapshot.docs[0];
      this.logger.debug(`Found user with customerId ${customerId}, document id: ${doc.id}`);
      return {
        id: doc.id,
        profile: doc.data() as UserProfile,
      };
    } catch (error) {
      this.logger.error(
        `Error getting user profile for customerId ${customerId}: ${error.message}`,
      );
      throw error;
    }
  }

  public async getBusinessUser(id: string): Promise<BusinessUser | null> {
    try {
      this.logger.debug(`Getting business user for id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.businessUsersCollection).doc(id).get();

      if (doc.exists) {
        this.logger.debug('Found user in business_users collection');
        return {
          id: doc.id,
          ...doc.data(),
        } as BusinessUser;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting business user for id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async createUserProfile(id: string, profile: CreateUserProfileDto): Promise<UserProfile> {
    try {
      this.logger.debug(`Creating user profile for id: ${id}`);
      const userProfile: UserProfile = {
        ...profile,
        userType: UserType.USER,
        managementId: uuidv4(),
        customerId: `NSP-${id}`,
        memberSince: `${new Date().getFullYear()}-${new Date().getMonth() + 1}`,
        businessHistory: [],
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      const db = this.firebaseService.getFirestore();
      await db.collection(this.usersCollection).doc(id).set(this.removeUndefined(userProfile));

      return userProfile;
    } catch (error) {
      this.logger.error(`Error creating user profile for id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      this.logger.debug(`Updating user profile for id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.usersCollection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('User not found');
      }

      const updateData = {
        ...profile,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.usersCollection).doc(id).update(this.removeUndefined(updateData));

      const updatedDoc = await db.collection(this.usersCollection).doc(id).get();
      return updatedDoc.data() as UserProfile;
    } catch (error) {
      this.logger.error(`Error updating user profile for id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting user profile for id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.usersCollection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('User not found');
      }

      await db.collection(this.usersCollection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting user profile for id ${id}: ${error.message}`);
      throw error;
    }
  }

  public async createBusinessUser(data: CreateBusinessUserDto): Promise<BusinessUser> {
    try {
      this.logger.debug('Creating business user');
      const db = this.firebaseService.getFirestore();

      const userData: Omit<BusinessUser, 'id'> = {
        email: data.email,
        businessIds: [data.businessId],
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
        isDeleted: false,
        needsReview: data.needsReview,
      };

      await db
        .collection(this.businessUsersCollection)
        .doc(data.userId)
        .set(this.removeUndefined(userData));

      return {
        id: data.userId,
        ...userData,
      };
    } catch (error) {
      this.logger.error(`Error creating business user: ${error.message}`);
      throw error;
    }
  }

  public async updateBusinessUser(id: string, data: Partial<BusinessUser>): Promise<BusinessUser> {
    try {
      this.logger.debug(`Updating business user ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.businessUsersCollection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Business user not found');
      }

      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db
        .collection(this.businessUsersCollection)
        .doc(id)
        .update(this.removeUndefined(updateData));

      const businessUser = await this.getBusinessUser(id);
      if (!businessUser) {
        throw new NotFoundException('Business user not found');
      }
      return businessUser;
    } catch (error) {
      this.logger.error(`Error updating business user ${id}: ${error.message}`);
      throw error;
    }
  }

  public async deleteBusinessUser(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting business user ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.businessUsersCollection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Business user not found');
      }

      const businessUser = doc.data() as BusinessUser;
      const batch = db.batch();

      // Aktualisiere alle zugehörigen Businesses
      for (const businessId of businessUser.businessIds) {
        const businessRef = db.collection('businesses').doc(businessId);
        batch.update(businessRef, {
          status: BusinessStatus.INACTIVE,
          hasAccount: false,
          updatedAt: DateTimeUtils.getBerlinTime(),
        });
      }

      // Lösche den Business-User
      batch.delete(db.collection(this.businessUsersCollection).doc(id));

      await batch.commit();

      this.logger.debug(
        `Successfully deleted business user ${id} and set associated businesses to INACTIVE`,
      );
    } catch (error) {
      this.logger.error(`Error deleting business user ${id}: ${error.message}`);
      throw new Error(`Failed to delete business user: ${error.message}`);
    }
  }

  public async toggleFavoriteEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      this.logger.debug(`Toggling favorite event ${eventId} for user ${userId}`);
      const userProfile = await this.getUserProfile(userId);

      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }

      const favoriteEventIds = userProfile.favoriteEventIds || [];
      let updatedFavorites: string[];
      let isAdded: boolean;

      if (favoriteEventIds.includes(eventId)) {
        updatedFavorites = favoriteEventIds.filter(id => id !== eventId);
        isAdded = false;
      } else {
        updatedFavorites = [...favoriteEventIds, eventId];
        isAdded = true;
      }

      await this.update(userId, { favoriteEventIds: updatedFavorites });

      try {
        await this.eventsService.updateFavoriteCount(eventId, isAdded);
      } catch (error) {
        this.logger.error(`Error updating favorite count: ${error.message}`);
      }

      return isAdded;
    } catch (error) {
      this.logger.error(`Error toggling favorite event for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async toggleFavoriteBusiness(userId: string, businessId: string): Promise<boolean> {
    try {
      this.logger.debug(`Toggling favorite business ${businessId} for user ${userId}`);
      const userProfile = await this.getUserProfile(userId);

      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }

      const favoriteBusinessIds = userProfile.favoriteBusinessIds || [];
      let updatedFavorites: string[];
      let isAdded: boolean;

      if (favoriteBusinessIds.includes(businessId)) {
        updatedFavorites = favoriteBusinessIds.filter(id => id !== businessId);
        isAdded = false;
      } else {
        updatedFavorites = [...favoriteBusinessIds, businessId];
        isAdded = true;
      }

      await this.update(userId, { favoriteBusinessIds: updatedFavorites });
      return isAdded;
    } catch (error) {
      this.logger.error(`Error toggling favorite business for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async addBusinessToUser(userId: string, businessId: string): Promise<BusinessUser> {
    try {
      this.logger.debug(`Adding business ${businessId} to user ${userId}`);
      const businessUser = await this.getBusinessUser(userId);

      if (!businessUser) {
        throw new NotFoundException('Business user not found');
      }

      if (businessUser.businessIds.includes(businessId)) {
        this.logger.debug(`Business ${businessId} already in user's list`);
        return businessUser;
      }

      const updatedBusinessIds = [...businessUser.businessIds, businessId];
      return this.updateBusinessUser(userId, { businessIds: updatedBusinessIds });
    } catch (error) {
      this.logger.error(`Error adding business to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async addEventToUser(userId: string, eventId: string): Promise<BusinessUser> {
    try {
      this.logger.debug(`Adding event ${eventId} to user ${userId}`);
      const businessUser = await this.getBusinessUser(userId);

      if (!businessUser) {
        throw new NotFoundException('Business user not found');
      }

      const currentEventIds = businessUser.eventIds || [];
      if (currentEventIds.includes(eventId)) {
        this.logger.debug(`Event ${eventId} already in user's list`);
        return businessUser;
      }

      const updatedEventIds = [...currentEventIds, eventId];
      return this.updateBusinessUser(userId, { eventIds: updatedEventIds });
    } catch (error) {
      this.logger.error(`Error adding event to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async getAllBusinessUsers(): Promise<BusinessUser[]> {
    try {
      this.logger.debug('Getting all business users');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.businessUsersCollection).get();

      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as BusinessUser,
      );
    } catch (error) {
      this.logger.error(`Error getting all business users: ${error.message}`);
      throw error;
    }
  }

  public async addBusinessIdToUser(userId: string, businessId: string): Promise<BusinessUser> {
    try {
      this.logger.debug(`Adding business ${businessId} to user ${userId}`);

      const [business, businessUser] = await Promise.all([
        this.businessesService.getById(businessId),
        this.getBusinessUser(userId),
      ]);

      if (!business) {
        throw new NotFoundException(`Business mit ID ${businessId} wurde nicht gefunden`);
      }

      if (!businessUser) {
        throw new NotFoundException(`Business-User mit ID ${userId} wurde nicht gefunden`);
      }

      if (businessUser.businessIds.includes(businessId)) {
        throw new BadRequestException(
          `Business ${businessId} ist bereits dem User ${userId} zugeordnet`,
        );
      }

      const db = this.firebaseService.getFirestore();
      const batch = db.batch();

      const businessUserRef = db.collection(this.businessUsersCollection).doc(userId);
      const updatedBusinessIds = [...businessUser.businessIds, businessId];

      batch.update(businessUserRef, {
        businessIds: updatedBusinessIds,
        updatedAt: DateTimeUtils.getBerlinTime(),
      });

      await batch.commit();
      await this.businessesService.updateHasAccount(businessId, true);

      const updatedBusinessUser = await this.getBusinessUser(userId);
      if (!updatedBusinessUser) {
        throw new Error('Business-User konnte nach dem Update nicht gefunden werden');
      }

      return updatedBusinessUser;
    } catch (error) {
      this.logger.error(`Fehler beim Hinzufügen des Businesses: ${error.message}`);
      throw new Error('Fehler beim Hinzufügen des Businesses zum User');
    }
  }

  public async getUserProfilesByIds(ids: string[]): Promise<Map<string, UserProfile>> {
    try {
      this.logger.debug(`Getting user profiles for ids: ${ids.join(', ')}`);
      if (ids.length === 0) {
        return new Map();
      }

      const db = this.firebaseService.getFirestore();
      const uniqueIds = [...new Set(ids)];
      const chunks = this.chunkArray(uniqueIds, 10);
      const userProfiles = new Map<string, UserProfile>();

      const chunkPromises = chunks.map(chunk =>
        db
          .collection(this.usersCollection)
          .where('__name__', 'in', chunk)
          .get()
          .then(snapshot => {
            snapshot.docs.forEach(doc => {
              userProfiles.set(doc.id, doc.data() as UserProfile);
            });
          }),
      );

      await Promise.all(chunkPromises);
      return userProfiles;
    } catch (error) {
      this.logger.error(`Error getting user profiles for ids: ${error.message}`);
      throw error;
    }
  }

  public async blockUser(
    customerId: string,
    isBlocked: boolean,
    blockReason?: string,
  ): Promise<UserProfile> {
    try {
      this.logger.debug(
        `Blocking/unblocking user with customerId ${customerId}, isBlocked: ${isBlocked}`,
      );
      const userResult = await this.getUserProfileByCustomerId(customerId);

      if (!userResult) {
        throw new NotFoundException(`User with customerId ${customerId} not found`);
      }

      const { id: userId, profile: userProfile } = userResult;

      const updateData: any = {
        isBlocked,
      };

      if (isBlocked) {
        updateData.blockedAt = DateTimeUtils.getBerlinTime();
        if (blockReason) {
          updateData.blockReason = blockReason;
        } else {
          updateData.blockReason = null;
        }
      } else {
        updateData.blockedAt = null;
        updateData.blockReason = null;
      }

      return this.update(userId, updateData);
    } catch (error) {
      this.logger.error(
        `Error blocking/unblocking user with customerId ${customerId}: ${error.message}`,
      );
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  public async blockUserForChat(userId: string, userIdToBlock: string): Promise<UserProfile> {
    try {
      this.logger.debug(`User ${userId} blocking user ${userIdToBlock} for direct chats`);
      if (userId === userIdToBlock) {
        throw new BadRequestException('Cannot block yourself');
      }
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }
      const blockedUserIds = userProfile.blockedUserIds || [];
      if (blockedUserIds.includes(userIdToBlock)) {
        throw new BadRequestException('User is already blocked');
      }
      const updatedBlockedUserIds = [...blockedUserIds, userIdToBlock];
      return this.update(userId, { blockedUserIds: updatedBlockedUserIds });
    } catch (error) {
      this.logger.error(
        `Error blocking user ${userIdToBlock} for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  public async unblockUserForChat(userId: string, userIdToUnblock: string): Promise<UserProfile> {
    try {
      this.logger.debug(`User ${userId} unblocking user ${userIdToUnblock} for direct chats`);
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }
      const blockedUserIds = userProfile.blockedUserIds || [];
      if (!blockedUserIds.includes(userIdToUnblock)) {
        throw new BadRequestException('User is not blocked');
      }
      const updatedBlockedUserIds = blockedUserIds.filter(id => id !== userIdToUnblock);
      return this.update(userId, { blockedUserIds: updatedBlockedUserIds });
    } catch (error) {
      this.logger.error(
        `Error unblocking user ${userIdToUnblock} for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  public async getBlockedUsers(userId: string): Promise<string[]> {
    try {
      this.logger.debug(`Getting blocked users for user ${userId}`);
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new NotFoundException('User profile not found');
      }
      return userProfile.blockedUserIds || [];
    } catch (error) {
      this.logger.error(`Error getting blocked users for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async registerFcmToken(userId: string, dto: RegisterFcmTokenDto): Promise<void> {
    try {
      this.logger.debug(`Registering FCM token for user ${userId}, device ${dto.deviceId}`);
      const userProfile = await this.getUserProfile(userId);
      if (userProfile) {
        const existingTokens = userProfile.fcmTokens || [];
        const existingTokenIndex = existingTokens.findIndex(
          token => token.deviceId === dto.deviceId,
        );
        const now = new Date().toISOString();
        let updatedTokens: FcmToken[];
        if (existingTokenIndex >= 0) {
          updatedTokens = existingTokens.map((token, index) =>
            index === existingTokenIndex
              ? {
                  ...token,
                  token: dto.token,
                  platform: dto.platform,
                  lastUsedAt: now,
                }
              : token,
          );
        } else {
          updatedTokens = [
            ...existingTokens,
            {
              token: dto.token,
              deviceId: dto.deviceId,
              platform: dto.platform,
              createdAt: now,
              lastUsedAt: now,
            },
          ];
        }
        await this.update(userId, { fcmTokens: updatedTokens });
        return;
      }
      const businessUser = await this.getBusinessUser(userId);
      if (businessUser) {
        const existingTokens = businessUser.fcmTokens || [];
        const existingTokenIndex = existingTokens.findIndex(
          token => token.deviceId === dto.deviceId,
        );
        const now = new Date().toISOString();
        let updatedTokens: FcmToken[];
        if (existingTokenIndex >= 0) {
          updatedTokens = existingTokens.map((token, index) =>
            index === existingTokenIndex
              ? {
                  ...token,
                  token: dto.token,
                  platform: dto.platform,
                  lastUsedAt: now,
                }
              : token,
          );
        } else {
          updatedTokens = [
            ...existingTokens,
            {
              token: dto.token,
              deviceId: dto.deviceId,
              platform: dto.platform,
              createdAt: now,
              lastUsedAt: now,
            },
          ];
        }
        await this.updateBusinessUser(userId, { fcmTokens: updatedTokens });
        return;
      }
      throw new NotFoundException('User not found');
    } catch (error) {
      this.logger.error(`Error registering FCM token for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async removeFcmToken(userId: string, deviceId: string): Promise<void> {
    try {
      this.logger.debug(`Removing FCM token for user ${userId}, device ${deviceId}`);
      const userProfile = await this.getUserProfile(userId);
      if (userProfile) {
        const existingTokens = userProfile.fcmTokens || [];
        const updatedTokens = existingTokens.filter(token => token.deviceId !== deviceId);
        await this.update(userId, { fcmTokens: updatedTokens });
        return;
      }
      const businessUser = await this.getBusinessUser(userId);
      if (businessUser) {
        const existingTokens = businessUser.fcmTokens || [];
        const updatedTokens = existingTokens.filter(token => token.deviceId !== deviceId);
        await this.updateBusinessUser(userId, { fcmTokens: updatedTokens });
        return;
      }
      throw new NotFoundException('User not found');
    } catch (error) {
      this.logger.error(`Error removing FCM token for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  public async getFcmTokens(userId: string): Promise<FcmToken[]> {
    try {
      this.logger.debug(`Getting FCM tokens for user ${userId}`);
      const userProfile = await this.getUserProfile(userId);
      if (userProfile) {
        return userProfile.fcmTokens || [];
      }
      const businessUser = await this.getBusinessUser(userId);
      if (businessUser) {
        return businessUser.fcmTokens || [];
      }
      throw new NotFoundException('User not found');
    } catch (error) {
      this.logger.error(`Error getting FCM tokens for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
