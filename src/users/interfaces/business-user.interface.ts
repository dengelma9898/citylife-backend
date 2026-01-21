import { BusinessUserNotificationPreferences } from './business-user-notification-preferences.interface';
import { FcmToken } from './user-profile.interface';

export interface BusinessUser {
  id: string;
  email: string;
  businessIds: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  needsReview: boolean;
  eventIds?: string[];
  contactRequestIds?: string[];
  notificationPreferences?: BusinessUserNotificationPreferences;
  fcmTokens?: FcmToken[];
}
