import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTextNewsDto {
  @IsString()
  @IsNotEmpty()
  public readonly content: string;

  @IsString()
  @IsNotEmpty()
  public readonly authorId: string;
} 