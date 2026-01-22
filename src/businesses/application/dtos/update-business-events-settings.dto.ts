import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBusinessEventsSettingsDto {
  @ApiProperty({
    description: 'Whether the business events feature is enabled',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isEnabled: boolean;
}
