import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddWinnerDto {
  @ApiProperty({
    description: 'Die User-ID des Gewinners',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  readonly userId: string;
}
