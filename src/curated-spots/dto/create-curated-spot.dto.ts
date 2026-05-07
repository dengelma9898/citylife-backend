import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CuratedSpotStatus } from '../domain/enums/curated-spot-status.enum';
import { CuratedSpotAddressDto } from './curated-spot-address.dto';
import { IsHttpUrlAllowingSpacesInPathConstraint } from './is-http-url-allowing-spaces.constraint';

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
  @Validate(IsHttpUrlAllowingSpacesInPathConstraint)
  readonly videoUrl?: string;

  @IsOptional()
  @Validate(IsHttpUrlAllowingSpacesInPathConstraint)
  readonly instagramUrl?: string;

  @IsOptional()
  @IsEnum(CuratedSpotStatus)
  readonly status?: CuratedSpotStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  readonly adminRating?: number;
}
