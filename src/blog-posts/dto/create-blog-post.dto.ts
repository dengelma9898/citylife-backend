import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

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

  @IsUrl()
  public readonly imageUrl: string;
} 