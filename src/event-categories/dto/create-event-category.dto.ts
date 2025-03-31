import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateEventCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  colorCode: string;
} 