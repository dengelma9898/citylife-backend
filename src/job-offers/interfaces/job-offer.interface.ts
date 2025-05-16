export interface JobOffer {
  id: string;
  title: string;
  companyLogo: string;
  generalDescription: string;
  neededProfile: string;
  tasks: string[];
  benefits: string[];
  images: string[];
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  typeOfEmployment: string;
  additionalNotesForTypeOfEmployment?: string;
  homeOffice: boolean;
  additionalNotesHomeOffice?: string;
  wage?: string;
  startDate: string;
  contactData: {
    person?: string;
    email: string;
    phone?: string;
  };
  link: string;
  socialMedia?: {
    linkedin?: string;
    xing?: string;
    instagram?: string;
    facebook?: string;
  };
  isHighlight: boolean;
  businessIds?: string[];
  jobOfferCategoryId: string;
  createdAt: string;
  updatedAt: string;
} 