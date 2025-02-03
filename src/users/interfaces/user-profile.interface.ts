import { UserType } from '../enums/user-type.enum';

export interface UserProfile {
  id: string;
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
} 