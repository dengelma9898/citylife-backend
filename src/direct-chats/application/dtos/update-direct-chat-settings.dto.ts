import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDirectChatSettingsDto {
  @ApiProperty({
    description: 'Whether the direct chat feature is enabled',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isEnabled: boolean;
}

