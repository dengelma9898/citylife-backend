import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageReactionDto {
  @ApiProperty({
    description: 'The type of reaction (emoji)',
    example: '👍',
  })
  @IsNotEmpty()
  @IsString()
  type: string;
}
