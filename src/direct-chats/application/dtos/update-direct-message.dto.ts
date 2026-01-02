import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDirectMessageDto {
  @ApiProperty({
    description: 'The updated content of the message',
    example: 'Updated message content',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'URL of the attached image (max 1 MB)',
    example: 'https://storage.example.com/images/photo.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}


