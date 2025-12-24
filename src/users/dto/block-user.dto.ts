import { IsBoolean, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockUserDto {
  @ApiProperty({
    description: 'Customer-ID des zu sperrenden/entsperrenden Users',
    example: 'NSP-user123',
  })
  @IsString()
  public readonly customerId: string;

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
