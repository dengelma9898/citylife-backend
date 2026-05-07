import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SpecialPollResponseDto {
  @ApiPropertyOptional({ description: 'Stabile Antwort-ID (wird ergänzt falls fehlend)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly userName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly response: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly createdAt: string;

  @ApiPropertyOptional({
    description: 'Nutzer-IDs die upgevotet haben',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly upvotedUserIds?: string[];
}
