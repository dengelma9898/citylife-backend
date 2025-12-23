import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    description: 'ID des zu sperrenden/entsperrenden Users',
    example: 'user123',
  })
  @IsString()
  public readonly userId: string;

  @ApiProperty({
    description: 'Sperr-Status (true = sperren, false = entsperren)',
    example: true,
  })
  @IsBoolean()
  public readonly isBlocked: boolean;

  @ApiProperty({
    description: 'Optionaler Grund für die Sperre',
    example: 'Verstoß gegen Nutzungsbedingungen',
    required: false,
  })
  @IsString()
  @IsOptional()
  public readonly blockReason?: string;
}
