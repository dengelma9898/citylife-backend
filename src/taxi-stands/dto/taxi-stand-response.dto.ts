import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxiStandLocation } from '../domain/entities/taxi-stand.entity';

export class TaxiStandResponseDto {
  @ApiProperty({ description: 'ID des Taxistandorts' })
  readonly id: string;

  @ApiPropertyOptional({ description: 'Titel des Taxistandorts' })
  readonly title?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Taxistandorts' })
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Anzahl verfügbarer Taxis' })
  readonly numberOfTaxis?: number;

  @ApiProperty({ description: 'Telefonnummer des Taxistandorts' })
  readonly phoneNumber: string;

  @ApiProperty({ description: 'Standort' })
  readonly location: TaxiStandLocation;

  @ApiProperty({ description: 'Liste der Telefon-Klick-Timestamps (ISO-Format)' })
  readonly phoneClickTimestamps: string[];

  @ApiProperty({ description: 'Erstellt am' })
  readonly createdAt: string;

  @ApiProperty({ description: 'Aktualisiert am' })
  readonly updatedAt: string;
}
