import { Preference } from '../../app-settings/interfaces/preference.interface';
import { EventCategory } from '../../event-categories/interfaces/event-category.interface';
import { BusinessCategory } from '../../business-categories/interfaces/business-category.interface';
import { Keyword } from '../../keywords/interfaces/keyword.interface';
import { UserProfile } from '../../users/interfaces/user-profile.interface';
import { BusinessUser } from '../../users/interfaces/business-user.interface';

export interface BootstrapAppVersionInfo {
  requiresUpdate: boolean;
  changelogContent?: string;
}

export interface BootstrapPublicPayload {
  appSettings: Preference[];
  eventCategories: EventCategory[];
  businessCategories: BusinessCategory[];
  keywords: Keyword[];
  downtime: { isDowntime: boolean };
  appVersion?: BootstrapAppVersionInfo;
}

export interface BootstrapResponse extends BootstrapPublicPayload {
  userProfile: UserProfile | BusinessUser | null;
}
