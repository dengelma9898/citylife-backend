import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessCategoryDto } from './business-category.dto';
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

  /**
   * Detaillierte Öffnungszeiten mit mehreren Intervallen pro Tag.
   * Beispiel: { Montag: [{ from: '08:00', to: '12:00' }, { from: '14:00', to: '22:00' }] }
   */
  @IsOptional()
  @IsObject()
  public readonly detailedOpeningHours?: Record<string, { from: string; to: string }[]>;

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
