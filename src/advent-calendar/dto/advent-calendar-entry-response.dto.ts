import { ApiProperty } from '@nestjs/swagger';

export class AdventCalendarEntryResponseDto {
  @ApiProperty({
    description: 'Die eindeutige ID des Eintrags',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  readonly id: string;

  @ApiProperty({
    description: 'Die Nummer des Adventskalender-Tages',
    example: 1,
  })
  readonly number: number;

  @ApiProperty({
    description: 'Gibt an, ob Benutzer an diesem Tag teilnehmen können',
    example: true,
  })
  readonly canParticipate: boolean;

  @ApiProperty({
    description: 'Gibt an, ob dieser Eintrag aktiv ist',
    example: true,
  })
  readonly isActive: boolean;

  @ApiProperty({
    description: 'Das Datum des Eintrags (ISO 8601 Format)',
    example: '2024-12-01',
  })
  readonly date: string;

  @ApiProperty({
    description: 'Gibt an, ob dies ein spezieller Eintrag ist',
    example: false,
  })
  readonly isSpecial: boolean;

  @ApiProperty({
    description: 'URL des Bildes für diesen Eintrag',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  readonly imageUrl?: string;

  @ApiProperty({
    description: 'Beschreibung des Eintrags',
    example: 'Erster Tag des Adventskalenders',
  })
  readonly description: string;

  @ApiProperty({
    description: 'Optionale URL für einen Link',
    example: 'https://example.com/link',
    required: false,
  })
  readonly linkUrl?: string;

  @ApiProperty({
    description: 'Liste der Teilnehmer-IDs',
    example: ['user1', 'user2'],
  })
  readonly participants: string[];

  @ApiProperty({
    description: 'Liste der Gewinner-IDs',
    example: ['user1'],
  })
  readonly winners: string[];

  @ApiProperty({
    description: 'Erstellungsdatum',
    example: '2024-11-01T10:00:00.000Z',
  })
  readonly createdAt: string;

  @ApiProperty({
    description: 'Aktualisierungsdatum',
    example: '2024-11-01T10:00:00.000Z',
  })
  readonly updatedAt: string;
}

