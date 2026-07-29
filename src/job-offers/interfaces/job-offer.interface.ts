export interface JobOfferLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface JobOfferContactData {
  person?: string;
  email: string;
  phone?: string;
}

export interface JobOfferSocialMedia {
  linkedin?: string;
  xing?: string;
  instagram?: string;
  facebook?: string;
}

export interface JobOffer {
  id: string;
  title: string;
  companyLogo: string;
  generalDescription: string;
  neededProfile: string;
  tasks: string[];
  benefits: string[];
  images: string[];
  location: JobOfferLocation;
  typeOfEmployment: string;
  additionalNotesForTypeOfEmployment?: string;
  homeOffice: boolean;
  additionalNotesHomeOffice?: string;
  wage?: string;
  startDate: string;
  contactData: JobOfferContactData;
  link: string;
  socialMedia?: JobOfferSocialMedia;
  isHighlight: boolean;
  businessIds?: string[];
  jobOfferCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
}
