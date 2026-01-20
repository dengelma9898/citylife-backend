import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '../enums/user-type.enum';
import { NotificationPreferencesDto } from './notification-preferences.dto';

export class UserProfileDto {
  @IsEmail()
  public readonly email: string;

  @IsEnum(UserType)
  public readonly userType: UserType;

  @IsString()
  public readonly managementId: string;

  @IsString()
  @IsOptional()
  public readonly name?: string;

  @IsString()
  @IsOptional()
  public readonly profilePictureUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly preferences?: string[];

  @IsString()
  @IsOptional()
  public readonly language?: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  @IsOptional()
  public readonly livingInCitySinceYear?: number;

  @IsString()
  @IsOptional()
  public readonly memberSince?: string;

  @IsString()
  @IsOptional()
  public readonly customerId?: string;

  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  @IsOptional()
  public readonly notificationPreferences?: NotificationPreferencesDto;
}
