import { IsBoolean } from 'class-validator';

/** Body of `PATCH /feature-flags/:flag`. */
export class UpdateFeatureFlagDto {
  @IsBoolean()
  readonly isEnabled: boolean;
}
