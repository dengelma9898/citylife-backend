import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EasterEggLocation } from '../domain/entities/easter-egg.entity';

export class EasterEggResponseDto {
  @ApiProperty({ description: 'ID des Ostereis' })
  readonly id: string;

  @ApiProperty({ description: 'Titel des Ostereis' })
  readonly title: string;

  @ApiProperty({ description: 'Beschreibung des Ostereis' })
  readonly description: string;

  @ApiPropertyOptional({ description: 'Bild-URL' })
  readonly imageUrl?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Gewinns' })
  readonly prizeDescription?: string;

  @ApiPropertyOptional({ description: 'Anzahl Gewinner pro Ei' })
  readonly numberOfWinners?: number;

  @ApiProperty({ description: 'Startdatum (YYYY-MM-DD)' })
  readonly startDate: string;

  @ApiPropertyOptional({ description: 'Enddatum (YYYY-MM-DD)' })
  readonly endDate?: string;

  @ApiProperty({ description: 'Standort' })
  readonly location: EasterEggLocation;

  @ApiProperty({ description: 'Anzahl Teilnehmer' })
  readonly participantCount: number;

  @ApiProperty({ description: 'Anzahl Gewinner' })
  readonly winnerCount: number;

  @ApiProperty({ description: 'Ob der anfragende User bereits bei diesem Ei teilgenommen hat' })
  readonly hasParticipated: boolean;

  @ApiProperty({ description: 'Erstellt am' })
  readonly createdAt: string;

  @ApiProperty({ description: 'Aktualisiert am' })
  readonly updatedAt: string;
}
