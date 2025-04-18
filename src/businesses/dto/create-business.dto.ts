import { IsString, IsNotEmpty, IsArray, ValidateNested, IsObject, IsDateString, IsBoolean, IsOptional } from 'class-validator';
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

  @IsString()
  @IsNotEmpty()
  public readonly categoryId: string;

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