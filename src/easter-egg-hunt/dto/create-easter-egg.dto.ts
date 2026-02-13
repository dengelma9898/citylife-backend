import { IsString, IsNotEmpty, IsNumber, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEasterEggDto {
  @ApiProperty({ description: 'Titel des Ostereis', example: 'Goldenes Ei am Hauptmarkt' })
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @ApiProperty({ description: 'Beschreibung des Ostereis', example: 'Versteckt hinter dem Schönen Brunnen' })
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Gewinns', example: '2x Kinogutscheine' })
  @IsOptional()
  @IsString()
  readonly prizeDescription?: string;

  @ApiPropertyOptional({ description: 'Anzahl Gewinner pro Ei (Default: 1)', example: 1 })
  @IsOptional()
  @IsNumber()
  readonly numberOfWinners?: number;

  @ApiProperty({ description: 'Startdatum (ISO-Format YYYY-MM-DD)', example: '2026-03-28' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate muss im Format YYYY-MM-DD sein' })
  readonly startDate: string;

  @ApiPropertyOptional({ description: 'Enddatum optional (ISO-Format YYYY-MM-DD)', example: '2026-04-06' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate muss im Format YYYY-MM-DD sein' })
  readonly endDate?: string;

  @ApiProperty({ description: 'Adresse des Standorts', example: 'Hauptmarkt 1, 90403 Nürnberg' })
  @IsString()
  @IsNotEmpty()
  readonly address: string;

  @ApiProperty({ description: 'Breitengrad', example: 49.4539 })
  @IsNumber()
  readonly latitude: number;

  @ApiProperty({ description: 'Längengrad', example: 11.0775 })
  @IsNumber()
  readonly longitude: number;
}
