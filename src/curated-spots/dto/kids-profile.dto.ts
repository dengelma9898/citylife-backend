import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsOptional, Validate } from 'class-validator';
import { KidsEquipmentTag } from '../domain/enums/kids-equipment-tag.enum';
import { KidsLocationType } from '../domain/enums/kids-location-type.enum';
import { AtLeastOneAgeGroupConstraint } from './at-least-one-age-group.constraint';

/** Kids profile of a curated spot; when present it must be complete. */
export class KidsProfileDto {
  @IsEnum(KidsLocationType)
  readonly locationType: KidsLocationType;

  @IsBoolean()
  @Validate(AtLeastOneAgeGroupConstraint)
  readonly suitableForToddlers: boolean;

  @IsBoolean()
  readonly suitableForSchoolKids: boolean;

  @IsBoolean()
  readonly isFree: boolean;

  @IsBoolean()
  readonly isBadWeatherTip: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(KidsEquipmentTag, { each: true })
  readonly equipmentTags?: KidsEquipmentTag[];
}
