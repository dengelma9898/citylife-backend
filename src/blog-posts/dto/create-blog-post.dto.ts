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
  @IsOptional()
  public readonly blogPictures?: string[];
  // blogPictures wird nicht als Teil des DTOs übergeben
  // Es wird durch den FilesInterceptor als separate Dateien verarbeitet
  // und erst nach dem Upload als URLs im BlogPost-Objekt gespeichert
}
