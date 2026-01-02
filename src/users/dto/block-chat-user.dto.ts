import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockChatUserDto {
  @ApiProperty({
    description: 'The ID of the user to block for direct chats',
    example: 'user-123',
  })
  @IsNotEmpty()
  @IsString()
  userIdToBlock: string;
}
