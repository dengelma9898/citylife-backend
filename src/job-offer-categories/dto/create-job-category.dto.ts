import { IsString, IsArray, IsNotEmpty } from 'class-validator';

export class CreateJobCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  colorCode: string;

  @IsString()
  @IsNotEmpty()
  iconName: string;

  @IsArray()
  @IsString({ each: true })
  fallbackImages: string[];
}
