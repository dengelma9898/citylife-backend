import { BusinessCategory } from './business-category.interface';
import { BusinessContact } from './business-contact.interface';
import { BusinessAddress } from './business-address.interface';

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  contact: BusinessContact;
  address: BusinessAddress;
  description: string;
  logo: string;
  photos: string[];
  openingHours: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
} 