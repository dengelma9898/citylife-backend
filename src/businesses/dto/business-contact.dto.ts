import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class BusinessContactDto {
  @IsString()
  @IsNotEmpty()
  public readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  public readonly lastName: string;

  @IsEmail()
  @IsOptional()
  public readonly email?: string;

  @IsString()
  @IsOptional()
  public readonly phoneNumber?: string;
} 