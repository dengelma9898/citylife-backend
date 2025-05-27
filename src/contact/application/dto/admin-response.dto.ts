import { IsString } from 'class-validator';

export class AdminResponseDto {
  @IsString()
  message: string;

  @IsString()
  userId: string;
}
