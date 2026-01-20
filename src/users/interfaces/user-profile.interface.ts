import { UserType } from '../enums/user-type.enum';
import { BusinessHistory } from './business-history.interface';

export interface FcmToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: string;
  lastUsedAt: string;
}

export interface NotificationPreferences {
  directMessages?: boolean;
  newBusinesses?: boolean;
  directChatRequests?: boolean;
  contactRequestResponses?: boolean;
}

export interface UserProfile {
  email: string;
  userType: UserType;
  managementId: string;
  name?: string;
  profilePictureUrl?: string;
  preferences?: string[];
  language?: string;
  livingInCitySinceYear?: number;
  memberSince?: string;
  customerId?: string;
  currentCityId?: string;
  businessHistory: BusinessHistory[];
  favoriteEventIds?: string[];
  favoriteBusinessIds?: string[];
  contactRequestIds?: string[];
  directChatIds?: string[];
  blockedUserIds?: string[];
  isBlocked?: boolean;
  blockedAt?: string;
  blockReason?: string;
  fcmTokens?: FcmToken[];
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}
