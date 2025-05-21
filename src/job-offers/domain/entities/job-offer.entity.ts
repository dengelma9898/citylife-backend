import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';

interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

interface ContactData {
  person?: string;
  email: string;
  phone?: string;
}

interface SocialMedia {
  linkedin?: string;
  xing?: string;
  instagram?: string;
  facebook?: string;
}

type JobOfferProps = {
  id?: string;
  title: string;
  companyLogo: string;
  generalDescription: string;
  neededProfile: string;
  tasks: string[];
  benefits: string[];
  images: string[];
  location: Location;
  typeOfEmployment: string;
  additionalNotesForTypeOfEmployment?: string;
  homeOffice: boolean;
  additionalNotesHomeOffice?: string;
  wage?: string;
  startDate: string;
  contactData: ContactData;
  link: string;
  socialMedia?: SocialMedia;
  isHighlight: boolean;
  businessIds?: string[];
  jobOfferCategoryId: string;
  createdAt: Date;
  updatedAt: Date;
};

export class JobOffer {
  readonly id: string;
  readonly title: string;
  readonly companyLogo: string;
  readonly generalDescription: string;
  readonly neededProfile: string;
  readonly tasks: string[];
  readonly benefits: string[];
  readonly images: string[];
  readonly location: Location;
  readonly typeOfEmployment: string;
  readonly additionalNotesForTypeOfEmployment?: string;
  readonly homeOffice: boolean;
  readonly additionalNotesHomeOffice?: string;
  readonly wage?: string;
  readonly startDate: string;
  readonly contactData: ContactData;
  readonly link: string;
  readonly socialMedia?: SocialMedia;
  readonly isHighlight: boolean;
  readonly businessIds?: string[];
  readonly jobOfferCategoryId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: JobOfferProps) {
    if (!props.id) {
      throw new Error('JobOffer ID is required');
    }
    this.id = props.id;
    this.title = props.title;
    this.companyLogo = props.companyLogo;
    this.generalDescription = props.generalDescription;
    this.neededProfile = props.neededProfile;
    this.tasks = props.tasks;
    this.benefits = props.benefits;
    this.images = props.images;
    this.location = props.location;
    this.typeOfEmployment = props.typeOfEmployment;
    this.additionalNotesForTypeOfEmployment = props.additionalNotesForTypeOfEmployment;
    this.homeOffice = props.homeOffice;
    this.additionalNotesHomeOffice = props.additionalNotesHomeOffice;
    this.wage = props.wage;
    this.startDate = props.startDate;
    this.contactData = props.contactData;
    this.link = props.link;
    this.socialMedia = props.socialMedia;
    this.isHighlight = props.isHighlight;
    this.businessIds = props.businessIds;
    this.jobOfferCategoryId = props.jobOfferCategoryId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CreateJobOfferDto): JobOffer {
    const now = new Date();
    return new JobOffer({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  update(props: Partial<CreateJobOfferDto>): JobOffer {
    return new JobOffer({
      ...this,
      ...props,
      updatedAt: new Date(),
    });
  }
} 