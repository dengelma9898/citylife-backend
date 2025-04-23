import { IsString } from 'class-validator';

export class GeneralContactRequestDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;
} 