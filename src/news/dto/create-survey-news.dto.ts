import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SurveyOptionDto {
  @IsString()
  @IsNotEmpty()
  public readonly text: string;
}

export class CreateSurveyNewsDto {
  @IsString()
  @IsNotEmpty()
  public readonly question: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => SurveyOptionDto)
  public readonly options: SurveyOptionDto[];

  @IsBoolean()
  @IsNotEmpty()
  public readonly allowMultipleAnswers: boolean;

  @IsString()
  @IsNotEmpty()
  public readonly authorId: string;

  @IsDateString()
  @IsOptional()
  public readonly expiresAt?: string;
}
