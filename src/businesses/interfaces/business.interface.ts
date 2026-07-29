import { BusinessStatus } from '../domain/enums/business-status.enum';
import { NuernbergspotsReview } from '../domain/nuernbergspots-review.type';

export interface BusinessContact {
  email?: string;
  phoneNumber?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

export interface BusinessAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface BusinessCustomer {
  customerId: string;
  scannedAt: string;
  price?: number | null;
  numberOfPeople?: number | null;
  additionalInfo?: string | null;
  benefit: string;
}

export interface Business {
  id: string;
  name: string;
  contact: BusinessContact;
  address: BusinessAddress;
  categoryIds: string[];
  keywordIds: string[];
  eventIds?: string[];
  description: string;
  logoUrl?: string;
  imageUrls?: string[];
  openingHours?: Record<string, string>;
  detailedOpeningHours?: Record<string, { from: string; to: string }[]>;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  status: BusinessStatus;
  benefit: string;
  previousBenefits?: string[];
  customers: BusinessCustomer[];
  hasAccount: boolean;
  isPromoted?: boolean;
  nuernbergspotsReview?: NuernbergspotsReview;
}
