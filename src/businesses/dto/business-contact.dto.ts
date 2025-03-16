import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUrl } from 'class-validator';

export class BusinessContactDto {

  @IsOptional()
  @IsEmail()
  public readonly email?: string;

  @IsOptional()
  @IsPhoneNumber('DE')
  public readonly phoneNumber?: string;

  @IsOptional()
  @IsString()
  public readonly instagram?: string;

  @IsOptional()
  @IsString()
  public readonly facebook?: string;

  @IsOptional()
  @IsString()
  public readonly tiktok?: string;

  @IsOptional()
  @IsUrl()
  public readonly website?: string;
} 