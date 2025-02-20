import { IsString, IsNotEmpty, IsArray, ValidateNested, IsObject, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessContactDto } from './business-contact.dto';
import { BusinessAddressDto } from './business-address.dto';
import { BusinessCategoryDto } from './business-category.dto';
export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @ValidateNested()
  @Type(() => BusinessCategoryDto)
  public readonly category: BusinessCategoryDto;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @ValidateNested()
  @Type(() => BusinessContactDto)
  public readonly contact: BusinessContactDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  public readonly address: BusinessAddressDto;

  @IsString()
  public readonly logo?: string;

  @IsArray()
  @IsString({ each: true })
  public readonly photos: string[] = [];

  @IsObject()
  public readonly openingHours: Record<string, string> = {};

  @IsBoolean()
  @IsOptional()
  public readonly isAdmin?: boolean = false;
} 