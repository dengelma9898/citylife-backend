import {
  IsString,
  IsArray,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsUrl,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContactDataDto {
  @IsOptional()
  @IsString()
  person?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class SocialMediaDto {
  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  xing?: string;

  @IsOptional()
  @IsUrl()
  instagram?: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;
}

class LocationDto {
  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class CreateJobOfferDto {
  @IsString()
  title: string;

  @IsString()
  companyLogo: string;

  @IsString()
  generalDescription: string;

  @IsString()
  neededProfile: string;

  @IsArray()
  @IsString({ each: true })
  tasks: string[];

  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsString()
  typeOfEmployment: string;

  @IsOptional()
  @IsString()
  additionalNotesForTypeOfEmployment?: string;

  @IsBoolean()
  homeOffice: boolean;

  @IsOptional()
  @IsString()
  additionalNotesHomeOffice?: string;

  @IsOptional()
  @IsString()
  wage?: string;

  @IsString()
  startDate: string;

  @ValidateNested()
  @Type(() => ContactDataDto)
  contactData: ContactDataDto;

  @IsUrl()
  link: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto;

  @IsBoolean()
  isHighlight: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessIds?: string[];

  @IsString()
  jobOfferCategoryId: string;
}
