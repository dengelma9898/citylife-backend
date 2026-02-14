import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxiStandDto {
  @ApiProperty({ description: 'Adresse des Taxistandorts', example: 'Hauptmarkt 1, 90403 Nürnberg' })
  @IsString()
  @IsNotEmpty()
  readonly address: string;

  @ApiProperty({ description: 'Breitengrad', example: 49.4539 })
  @IsNumber()
  readonly latitude: number;

  @ApiProperty({ description: 'Längengrad', example: 11.0775 })
  @IsNumber()
  readonly longitude: number;

  @ApiProperty({ description: 'Telefonnummer des Taxistandorts', example: '+49 911 19410' })
  @IsString()
  @IsNotEmpty()
  readonly phoneNumber: string;

  @ApiPropertyOptional({ description: 'Titel des Taxistandorts', example: 'Hauptbahnhof Nürnberg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly title?: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Taxistandorts', example: 'Vor dem Haupteingang' })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiPropertyOptional({ description: 'Anzahl verfügbarer Taxis', example: 10 })
  @IsOptional()
  @IsNumber()
  readonly numberOfTaxis?: number;
}
