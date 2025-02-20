import { IsString, IsEmail, IsArray } from 'class-validator';

export class CreateBusinessUserDto {
  @IsString()
  public readonly userId: string;

  @IsEmail()
  public readonly email: string;

  @IsString()
  public readonly businessId: string;
} 