import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateImageNewsDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public imageUrls: string[] = [];
  
  @IsString()
  @IsOptional()
  public readonly content: string = '';
  
  @IsString()
  @IsNotEmpty()
  public readonly authorId: string;
} 