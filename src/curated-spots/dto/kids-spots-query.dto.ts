import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { KidsAgeGroup } from '../domain/enums/kids-age-group.enum';
import { KidsLocationType } from '../domain/enums/kids-location-type.enum';

/** Query parameters of `GET /curated-spots/kids`. Booleans arrive as `"true"` / `"false"`. */
export class KidsSpotsQueryDto {
  @ApiPropertyOptional({ enum: KidsLocationType })
  @IsOptional()
  @IsEnum(KidsLocationType)
  readonly locationType?: KidsLocationType;

  @ApiPropertyOptional({ enum: KidsAgeGroup })
  @IsOptional()
  @IsEnum(KidsAgeGroup)
  readonly ageGroup?: KidsAgeGroup;

  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'true = only free spots' })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly isFree?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'true = only bad-weather tips' })
  @IsOptional()
  @IsIn(['true', 'false'])
  readonly isBadWeatherTip?: string;
}
