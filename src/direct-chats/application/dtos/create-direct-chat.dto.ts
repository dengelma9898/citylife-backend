import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDirectChatDto {
  @ApiProperty({
    description: 'The ID of the user to invite to the direct chat',
    example: 'user-123',
  })
  @IsNotEmpty()
  @IsString()
  invitedUserId: string;
}
