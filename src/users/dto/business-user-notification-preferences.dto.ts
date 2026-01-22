import { IsBoolean, IsOptional } from 'class-validator';

export class BusinessUserNotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  public readonly businessActivated?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly businessContactRequestResponses?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly businessStatusChanged?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly eventInteractions?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly businessReviews?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly businessPerformanceSummary?: boolean;
}
