import { IsString, IsNotEmpty, IsArray, IsBoolean, IsDateString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessCategoryDto } from '../../business-categories/dto/business-category.dto';
import { BusinessContactDto } from './business-contact.dto';
import { BusinessAddressDto } from './business-address.dto';

export class BusinessDto {
  @IsString()
  @IsNotEmpty()
  public readonly id: string;

  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @ValidateNested()
  @Type(() => BusinessCategoryDto)
  public readonly category: BusinessCategoryDto;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @IsString()
  @IsNotEmpty()
  public readonly logo: string;

  @IsArray()
  @IsString({ each: true })
  public readonly photos: string[];

  @IsObject()
  public readonly openingHours: Record<string, string>;

  @IsDateString()
  public readonly createdAt: string;

  @IsDateString()
  public readonly updatedAt: string;

  @IsBoolean()
  public readonly isDeleted: boolean;

  @ValidateNested()
  @Type(() => BusinessContactDto)
  public readonly contact: BusinessContactDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  public readonly address: BusinessAddressDto;
} 