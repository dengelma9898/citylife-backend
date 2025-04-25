import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Die Nachricht, die zur Kontaktanfrage hinzugefügt werden soll',
    example: 'Vielen Dank für Ihre Anfrage. Wir werden uns in Kürze bei Ihnen melden.'
  })
  message: string;
} 