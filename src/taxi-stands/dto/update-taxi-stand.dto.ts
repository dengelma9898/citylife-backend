import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaxiStandDto {
  @ApiPropertyOptional({ description: 'Adresse des Taxistandorts' })
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

  @ApiPropertyOptional({ description: 'Telefonnummer des Taxistandorts' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Titel des Taxistandorts' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly title?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Taxistandorts' })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Anzahl verfügbarer Taxis' })
  @IsOptional()
  @IsNumber()
  readonly numberOfTaxis?: number;
}
