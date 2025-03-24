import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class VoteSurveyDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ArrayMinSize(1)
  public readonly optionIds: string[];

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;
} 