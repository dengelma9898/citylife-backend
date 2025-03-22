import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateBusinessCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  keywordIds?: string[];
} 