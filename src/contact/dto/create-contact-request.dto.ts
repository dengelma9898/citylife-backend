import { IsEnum, IsString, IsEmail, IsOptional } from 'class-validator';
import { ContactRequestType } from '../interfaces/contact-request.interface';

export class CreateContactRequestDto {
  @IsEnum(ContactRequestType)
  type: ContactRequestType;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  businessId?: string;
} 