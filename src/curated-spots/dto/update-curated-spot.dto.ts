import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CuratedSpotStatus } from '../domain/enums/curated-spot-status.enum';
import { CuratedSpotAddressDto } from './curated-spot-address.dto';

export class UpdateCuratedSpotDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  readonly descriptionMarkdown?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CuratedSpotAddressDto)
  readonly address?: CuratedSpotAddressDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly keywordIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  readonly newKeywordNames?: string[];

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  readonly videoUrl?: string | null;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  readonly instagramUrl?: string | null;

  @IsOptional()
  @IsEnum(CuratedSpotStatus)
  readonly status?: CuratedSpotStatus;

  @IsOptional()
  @IsBoolean()
  readonly isDeleted?: boolean;
}
