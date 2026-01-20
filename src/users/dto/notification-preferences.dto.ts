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
}
