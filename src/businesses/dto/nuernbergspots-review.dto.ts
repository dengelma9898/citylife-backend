import { IsString, IsArray, IsOptional } from 'class-validator';

export class NuernbergspotsReviewDto {
  @IsString()
  @IsOptional()
  reviewText?: string;
  @IsArray()
  @IsOptional()
  reviewImageUrls?: string[];
}
