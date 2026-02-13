import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetFeatureStatusDto {
  @ApiProperty({ description: 'Gibt an, ob das Easter Egg Hunt Feature aktiviert ist', example: true })
  @IsBoolean()
  @IsNotEmpty()
  readonly isFeatureActive: boolean;

  @ApiPropertyOptional({ description: 'Startdatum (ISO-Format YYYY-MM-DD)', example: '2026-03-28' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate muss im Format YYYY-MM-DD sein' })
  readonly startDate?: string;
}
