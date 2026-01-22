import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessUserNotificationPreferencesDto } from './business-user-notification-preferences.dto';

export class UpdateBusinessUserDto {
  @IsEmail()
  @IsOptional()
  public readonly email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly businessIds?: string[];

  @IsBoolean()
  @IsOptional()
  public readonly needsReview?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly eventIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly contactRequestIds?: string[];

  @ValidateNested()
  @Type(() => BusinessUserNotificationPreferencesDto)
  @IsOptional()
  public readonly notificationPreferences?: BusinessUserNotificationPreferencesDto;
}
