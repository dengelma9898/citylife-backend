import { BusinessContact } from './business-contact.interface';
import { BusinessAddress } from './business-address.interface';
import { BusinessCustomer } from './business-customer.interface';
import { Event } from '../../events/interfaces/event.interface';

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
  eventIds?: string[];
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
  previousBenefits?: string[];
  customers: BusinessCustomer[];
  hasAccount: boolean;
  isPromoted?: boolean;
}

/**
 * Basis-Response für Business-Liste
 * Enthält nur die Event-IDs
 */
export interface BusinessListResponse extends Omit<Business, 'eventIds'> {
  category: {
    id: string;
    name: string;
    iconName: string;
  };
  keywordNames: string[];
  eventIds?: string[];
}

/**
 * Erweiterte Business-Schnittstelle für Detailansicht
 * Enthält die vollständigen Event-Objekte
 */
export interface BusinessResponse extends BusinessListResponse {
  events?: Event[];
} 