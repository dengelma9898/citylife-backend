import { IsString, IsNotEmpty, IsUrl, IsArray, IsOptional } from 'class-validator';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly content: string;

  @IsString()
  @IsNotEmpty()
  public readonly authorName: string;

  @IsString()
  public readonly imageUrl: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly blogPictures?: string[];
} 