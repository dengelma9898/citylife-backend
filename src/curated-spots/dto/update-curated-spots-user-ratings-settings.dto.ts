import { IsBoolean } from 'class-validator';

export class UpdateCuratedSpotsUserRatingsSettingsDto {
  @IsBoolean()
  readonly isEnabled: boolean;
}
