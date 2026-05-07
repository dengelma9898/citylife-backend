import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CuratedSpotStatus } from '../domain/enums/curated-spot-status.enum';
import { CuratedSpotAddressDto } from './curated-spot-address.dto';
import { IsHttpUrlAllowingSpacesInPathConstraint } from './is-http-url-allowing-spaces.constraint';

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
  @Validate(IsHttpUrlAllowingSpacesInPathConstraint)
  readonly videoUrl?: string | null;

  @IsOptional()
  @Validate(IsHttpUrlAllowingSpacesInPathConstraint)
  readonly instagramUrl?: string | null;

  @IsOptional()
  @IsEnum(CuratedSpotStatus)
  readonly status?: CuratedSpotStatus;

  @IsOptional()
  @IsBoolean()
  readonly isDeleted?: boolean;

  @IsOptional()
  @ValidateIf(o => o.adminRating !== null && o.adminRating !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  readonly adminRating?: number | null;
}
