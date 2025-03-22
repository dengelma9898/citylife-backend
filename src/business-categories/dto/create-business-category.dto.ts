import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateBusinessCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  iconName: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  keywordIds?: string[];
} 