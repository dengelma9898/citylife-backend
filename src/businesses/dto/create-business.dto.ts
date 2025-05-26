import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsObject,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BusinessContactDto } from './business-contact.dto';
import { BusinessAddressDto } from './business-address.dto';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @ValidateNested()
  @Type(() => BusinessContactDto)
  public readonly contact: BusinessContactDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  public readonly address: BusinessAddressDto;

  @IsObject()
  public readonly openingHours: Record<string, string> = {};

  /**
   * Detaillierte Öffnungszeiten mit mehreren Intervallen pro Tag.
   * Beispiel: { Montag: [{ from: '08:00', to: '12:00' }, { from: '14:00', to: '22:00' }] }
   */
  @IsOptional()
  @IsObject()
  public readonly detailedOpeningHours?: Record<string, { from: string; to: string }[]>;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  public readonly categoryIds: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly keywordIds?: string[];

  @IsBoolean()
  @IsOptional()
  public readonly isAdmin?: boolean = false;

  @IsString()
  @IsNotEmpty()
  public readonly benefit: string;

  @IsBoolean()
  @IsNotEmpty()
  public readonly hasAccount: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly isPromoted?: boolean = false;
}
