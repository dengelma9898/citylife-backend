import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class UpdateImagesDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  public readonly imageUrls: string[];
}
