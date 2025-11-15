import { IsNumber, IsBoolean, IsString, IsOptional, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdventCalendarEntryDto {
  @ApiProperty({
    description: 'Die Nummer des Adventskalender-Tages',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  readonly number: number;

  @ApiProperty({
    description: 'Gibt an, ob Benutzer an diesem Tag teilnehmen können',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly canParticipate: boolean;

  @ApiProperty({
    description: 'Gibt an, ob dieser Eintrag aktiv ist',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly isActive: boolean;

  @ApiProperty({
    description: 'Das Datum des Eintrags (ISO 8601 Format)',
    example: '2024-12-01',
  })
  @IsString()
  @IsNotEmpty()
  readonly date: string;

  @ApiProperty({
    description: 'Gibt an, ob dies ein spezieller Eintrag ist',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly isSpecial: boolean;

  @ApiProperty({
    description: 'Beschreibung des Eintrags',
    example: 'Erster Tag des Adventskalenders',
  })
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @ApiProperty({
    description: 'Optionale URL für einen Link',
    example: 'https://example.com/link',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  readonly linkUrl?: string;
}

