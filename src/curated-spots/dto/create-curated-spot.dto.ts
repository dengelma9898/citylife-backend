import {
  IsArray,
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

export class CreateCuratedSpotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  readonly descriptionMarkdown: string;

  @ValidateNested()
  @Type(() => CuratedSpotAddressDto)
  readonly address: CuratedSpotAddressDto;

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
  readonly videoUrl?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(2000)
  readonly instagramUrl?: string;

  @IsOptional()
  @IsEnum(CuratedSpotStatus)
  readonly status?: CuratedSpotStatus;
}
