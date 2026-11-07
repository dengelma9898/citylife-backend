import {
  IsArray,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChristmasMarketDto {
  @ApiPropertyOptional({
    description: 'Optionale Dokument-ID (Slug). Ohne Angabe vergibt Firestore eine Auto-ID.',
    example: 'nuernberg-christkindlesmarkt',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'id must be a lowercase slug (letters, digits, hyphens)',
  })
  readonly id?: string;

  @ApiProperty({ example: 'Nürnberger Christkindlesmarkt' })
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @ApiProperty({ example: 'Nürnberg' })
  @IsString()
  @IsNotEmpty()
  readonly city: string;

  @ApiProperty({ example: 'Hauptmarkt' })
  @IsString()
  @IsNotEmpty()
  readonly place: string;

  @ApiProperty({ example: 'Einer der ältesten Weihnachtsmärkte Deutschlands.' })
  @IsString()
  @IsNotEmpty()
  readonly description: string;

  @ApiProperty({ example: '27.11. – 24.12.2026' })
  @IsString()
  @IsNotEmpty()
  readonly periodLabel: string;

  @ApiProperty({ example: 'Täglich 10–21 Uhr' })
  @IsString()
  @IsNotEmpty()
  readonly openingHoursLabel: string;

  @ApiPropertyOptional({ example: '2026-11-27' })
  @IsOptional()
  @IsISO8601()
  readonly startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-24' })
  @IsOptional()
  @IsISO8601()
  readonly endDate?: string;

  @ApiProperty({ example: 49.4541 })
  @IsLatitude()
  readonly latitude: number;

  @ApiProperty({ example: 11.0773 })
  @IsLongitude()
  readonly longitude: number;

  @ApiPropertyOptional({ example: 'https://example.com/markt.jpg' })
  @IsOptional()
  @IsUrl()
  readonly imageUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['Christkind', 'Kinderweihnacht'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly highlights?: string[];
}
