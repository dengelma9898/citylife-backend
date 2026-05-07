import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialPollDto {
  @ApiProperty({
    description: 'Der Titel der Umfrage',
    example: 'Wohin soll der nächste Stadtausflug gehen?',
  })
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @ApiPropertyOptional({
    description: 'Hervorgehobene Umfrage (Standard: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly isHighlighted?: boolean;
}
