import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  public readonly directMessages?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly newBusinesses?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly directChatRequests?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly contactRequestResponses?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly newEvents?: boolean;

  @IsBoolean()
  @IsOptional()
  public readonly eventUpdates?: boolean;
}
