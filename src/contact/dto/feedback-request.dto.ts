import { IsString } from 'class-validator';

export class FeedbackRequestDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;
} 