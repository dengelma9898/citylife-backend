import { IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';

export class BusinessContactDto {

  @IsOptional()
  @IsEmail()
  public readonly email?: string;

  @IsOptional()
  @IsPhoneNumber('DE')
  public readonly phoneNumber?: string;
} 