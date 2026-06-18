import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';
import { IsValidCategory } from './validators/is-valid-category.validator';

export class BulkUpdateEventCategoryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  public readonly eventIds: string[];

  @IsString()
  @IsNotEmpty()
  @IsValidCategory()
  public readonly categoryId: string;
}
