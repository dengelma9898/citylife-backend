import { NuernbergspotsReview } from '../../interfaces/business.interface';
import { BusinessStatus } from '../enums/business-status.enum';

export interface BusinessContactProps {
  email?: string;
  phoneNumber?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  website?: string;
}

export class BusinessContact {
  readonly email?: string;
  readonly phoneNumber?: string;
  readonly instagram?: string;
  readonly facebook?: string;
  readonly tiktok?: string;
  readonly website?: string;

  private constructor(props: BusinessContactProps) {
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.instagram = props.instagram;
    this.facebook = props.facebook;
    this.tiktok = props.tiktok;
    this.website = props.website;
  }

  static create(props: BusinessContactProps): BusinessContact {
    return new BusinessContact(props);
  }

  toJSON(): BusinessContactProps {
    return {
      email: this.email,
      phoneNumber: this.phoneNumber,
      instagram: this.instagram,
      facebook: this.facebook,
      tiktok: this.tiktok,
      website: this.website
    };
  }
}

export interface BusinessAddressProps {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export class BusinessAddress {
  readonly street: string;
  readonly houseNumber: string;
  readonly postalCode: string;
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;

  private constructor(props: BusinessAddressProps) {
    this.street = props.street;
    this.houseNumber = props.houseNumber;
    this.postalCode = props.postalCode;
    this.city = props.city;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }

  static create(props: BusinessAddressProps): BusinessAddress {
    return new BusinessAddress(props);
  }

  toJSON(): BusinessAddressProps {
    return {
      street: this.street,
      houseNumber: this.houseNumber,
      postalCode: this.postalCode,
      city: this.city,
      latitude: this.latitude,
      longitude: this.longitude
    };
  }
}

export interface BusinessCustomerProps {
  customerId: string;
  scannedAt: string;
  price?: number | null;
  numberOfPeople?: number | null;
  additionalInfo?: string | null;
  benefit: string;
}

export class BusinessCustomer {
  readonly customerId: string;
  readonly scannedAt: string;
  readonly price?: number | null;
  readonly numberOfPeople?: number | null;
  readonly additionalInfo?: string | null;
  readonly benefit: string;

  private constructor(props: BusinessCustomerProps) {
    this.customerId = props.customerId;
    this.scannedAt = props.scannedAt;
    this.price = props.price;
    this.numberOfPeople = props.numberOfPeople;
    this.additionalInfo = props.additionalInfo;
    this.benefit = props.benefit;
  }

  static create(props: BusinessCustomerProps): BusinessCustomer {
    return new BusinessCustomer(props);
  }

  toJSON(): BusinessCustomerProps {
    return {
      customerId: this.customerId,
      scannedAt: this.scannedAt,
      price: this.price,
      numberOfPeople: this.numberOfPeople,
      additionalInfo: this.additionalInfo,
      benefit: this.benefit
    };
  }
}

export interface BusinessProps {
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

export class Business {
  readonly id: string;
  readonly name: string;
  readonly contact: BusinessContact;
  readonly address: BusinessAddress;
  readonly categoryIds: string[];
  readonly keywordIds: string[];
  readonly eventIds?: string[];
  readonly description: string;
  readonly logoUrl?: string;
  readonly imageUrls?: string[];
  readonly openingHours?: Record<string, string>;
  readonly detailedOpeningHours?: Record<string, { from: string; to: string }[]>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isDeleted: boolean;
  readonly status: BusinessStatus;
  readonly benefit: string;
  readonly previousBenefits?: string[];
  readonly customers: BusinessCustomer[];
  readonly hasAccount: boolean;
  readonly isPromoted?: boolean;
  readonly nuernbergspotsReview?: NuernbergspotsReview;

  private constructor(props: BusinessProps) {
    this.id = props.id;
    this.name = props.name;
    this.contact = props.contact;
    this.address = props.address;
    this.categoryIds = props.categoryIds;
    this.keywordIds = props.keywordIds;
    this.eventIds = props.eventIds;
    this.description = props.description;
    this.logoUrl = props.logoUrl;
    this.imageUrls = props.imageUrls;
    this.openingHours = props.openingHours;
    this.detailedOpeningHours = props.detailedOpeningHours;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.isDeleted = props.isDeleted;
    this.status = props.status;
    this.benefit = props.benefit;
    this.previousBenefits = props.previousBenefits;
    this.customers = props.customers;
    this.hasAccount = props.hasAccount;
    this.isPromoted = props.isPromoted;
    this.nuernbergspotsReview = props.nuernbergspotsReview;
  }

  static create(props: Omit<BusinessProps, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'customers' | 'previousBenefits'>): Business {
    const now = new Date().toISOString();
    return new Business({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      customers: [],
      previousBenefits: []
    });
  }

  static fromProps(props: BusinessProps): Business {
    return new Business(props);
  }

  update(props: Partial<Omit<BusinessProps, 'id' | 'createdAt'>>): Business {
    return new Business({
      ...this,
      ...props,
      updatedAt: new Date().toISOString()
    });
  }

  addCustomer(customer: BusinessCustomer): Business {
    return this.update({
      customers: [...this.customers, customer]
    });
  }

  updateStatus(status: BusinessStatus): Business {
    return this.update({ status });
  }

  updateBenefit(benefit: string): Business {
    return this.update({
      benefit,
      previousBenefits: [...(this.previousBenefits || []), this.benefit]
    });
  }

  toJSON(): BusinessProps {
    return {
      id: this.id,
      name: this.name,
      contact: this.contact,
      address: this.address,
      categoryIds: this.categoryIds,
      keywordIds: this.keywordIds,
      eventIds: this.eventIds,
      description: this.description,
      logoUrl: this.logoUrl,
      imageUrls: this.imageUrls,
      openingHours: this.openingHours,
      detailedOpeningHours: this.detailedOpeningHours,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isDeleted: this.isDeleted,
      status: this.status,
      benefit: this.benefit,
      previousBenefits: this.previousBenefits,
      customers: this.customers,
      hasAccount: this.hasAccount,
      isPromoted: this.isPromoted,
      nuernbergspotsReview: this.nuernbergspotsReview
    };
  }
} 