import {
  IsArray,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateChristmasMarketDto {
  @ApiPropertyOptional({ example: 'Nürnberger Christkindlesmarkt' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly name?: string;

  @ApiPropertyOptional({ example: 'Nürnberg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly city?: string;

  @ApiPropertyOptional({ example: 'Hauptmarkt' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly place?: string;

  @ApiPropertyOptional({ example: 'Einer der ältesten Weihnachtsmärkte Deutschlands.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly description?: string;

  @ApiPropertyOptional({ example: '27.11. – 24.12.2026' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly periodLabel?: string;

  @ApiPropertyOptional({ example: 'Täglich 10–21 Uhr' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly openingHoursLabel?: string;

  @ApiPropertyOptional({ example: '2026-11-27' })
  @IsOptional()
  @IsISO8601()
  readonly startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-24' })
  @IsOptional()
  @IsISO8601()
  readonly endDate?: string;

  @ApiPropertyOptional({ example: 49.4541 })
  @IsOptional()
  @IsLatitude()
  readonly latitude?: number;

  @ApiPropertyOptional({ example: 11.0773 })
  @IsOptional()
  @IsLongitude()
  readonly longitude?: number;

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
