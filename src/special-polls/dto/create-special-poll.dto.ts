import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpecialPollDto {
  @ApiProperty({
    description: 'Der Titel der Umfrage',
    example: 'Wohin soll der nächste Stadtausflug gehen?'
  })
  @IsString()
  @IsNotEmpty()
  readonly title: string;
} 