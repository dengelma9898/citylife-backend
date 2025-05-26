import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsDateString,
  IsOptional,
  ValidateNested,
  ArrayMinSize,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PollOptionDto {
  @IsString()
  @IsNotEmpty()
  public readonly id: string;

  @IsString()
  @IsNotEmpty()
  public readonly text: string;
}

export class PollInfoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => PollOptionDto)
  public readonly options: PollOptionDto[];

  @IsDateString()
  @IsOptional()
  public readonly endDate?: string;

  @IsBoolean()
  public readonly allowMultipleChoices: boolean;

  @IsObject()
  @IsOptional()
  public readonly votes?: Record<string, any>;
}

export class CreatePollNewsDto {
  @IsString()
  @IsNotEmpty()
  public readonly content: string;

  @IsString()
  @IsNotEmpty()
  public readonly authorId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PollInfoDto)
  public readonly pollInfo: PollInfoDto;
}
