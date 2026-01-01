import { UserType } from '../enums/user-type.enum';
import { BusinessHistory } from './business-history.interface';

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
  isBlocked?: boolean;
  blockedAt?: string;
  blockReason?: string;
  createdAt?: string;
  updatedAt?: string;
}
