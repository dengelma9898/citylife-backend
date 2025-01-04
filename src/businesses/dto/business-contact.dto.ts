import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class BusinessContactDto {
  @IsString()
  @IsNotEmpty()
  public readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  public readonly lastName: string;

  @IsEmail()
  public readonly email: string;

  @IsString()
  @IsNotEmpty()
  public readonly phoneNumber: string;
} 