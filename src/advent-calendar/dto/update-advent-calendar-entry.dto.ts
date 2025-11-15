import { IsNumber, IsBoolean, IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAdventCalendarEntryDto {
  @ApiProperty({
    description: 'Die Nummer des Adventskalender-Tages',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  readonly number?: number;

  @ApiProperty({
    description: 'Gibt an, ob Benutzer an diesem Tag teilnehmen können',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly canParticipate?: boolean;

  @ApiProperty({
    description: 'Gibt an, ob dieser Eintrag aktiv ist',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;

  @ApiProperty({
    description: 'Das Datum des Eintrags (ISO 8601 Format)',
    example: '2024-12-01',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly date?: string;

  @ApiProperty({
    description: 'Gibt an, ob dies ein spezieller Eintrag ist',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly isSpecial?: boolean;

  @ApiProperty({
    description: 'URL des Bildes für diesen Eintrag',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  readonly imageUrl?: string;

  @ApiProperty({
    description: 'Beschreibung des Eintrags',
    example: 'Erster Tag des Adventskalenders',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly description?: string;

  @ApiProperty({
    description: 'Optionale URL für einen Link',
    example: 'https://example.com/link',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  readonly linkUrl?: string;
}

