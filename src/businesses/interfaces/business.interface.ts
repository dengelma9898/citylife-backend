import { BusinessCategory } from './business-category.interface';
import { BusinessContact } from './business-contact.interface';
import { BusinessAddress } from './business-address.interface';
import { BusinessCustomer } from './business-customer.interface';

export enum BusinessStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export interface NuernbergspotsReview {
  reviewText?: string;
  reviewImageUrls?: string[];
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  contact: BusinessContact;
  address: BusinessAddress;
  categoryId: string;
  keywordIds?: string[];
  description: string;
  logoUrl?: string;
  imageUrls?: string[];
  nuernbergspotsReview?: NuernbergspotsReview;
  openingHours: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  status: BusinessStatus;
  benefit: string;
  customers: BusinessCustomer[];
  hasAccount: boolean;
}

/**
 * Erweiterte Business-Schnittstelle mit aufgelösten Kategorien und Keywords
 * die als Antwort an den Client gesendet wird
 */
export interface BusinessResponse extends Business {
  category: {
    id: string;
    name: string;
    iconName: string;
  };
  keywordNames: string[];
} 