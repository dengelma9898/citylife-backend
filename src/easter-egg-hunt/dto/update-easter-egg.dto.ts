import { IsString, IsNotEmpty, IsNumber, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEasterEggDto {
  @ApiPropertyOptional({ description: 'Titel des Ostereis' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly title?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Ostereis' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Gewinns' })
  @IsOptional()
  @IsString()
  readonly prizeDescription?: string;

  @ApiPropertyOptional({ description: 'Anzahl Gewinner pro Ei' })
  @IsOptional()
  @IsNumber()
  readonly numberOfWinners?: number;

  @ApiPropertyOptional({ description: 'Startdatum (ISO-Format YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate muss im Format YYYY-MM-DD sein' })
  readonly startDate?: string;

  @ApiPropertyOptional({ description: 'Enddatum optional (ISO-Format YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate muss im Format YYYY-MM-DD sein' })
  readonly endDate?: string;

  @ApiPropertyOptional({ description: 'Adresse des Standorts' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly address?: string;

  @ApiPropertyOptional({ description: 'Breitengrad' })
  @IsOptional()
  @IsNumber()
  readonly latitude?: number;

  @ApiPropertyOptional({ description: 'Längengrad' })
  @IsOptional()
  @IsNumber()
  readonly longitude?: number;
}
