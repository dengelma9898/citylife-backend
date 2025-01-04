import { IsString, IsNotEmpty, IsDateString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class EventLocationDto {
  @IsNumber()
  public readonly latitude: number;

  @IsNumber()
  public readonly longitude: number;
}

export class EventDto {
  @IsString()
  @IsNotEmpty()
  public readonly cityId: string;

  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @IsDateString()
  public readonly startDate: string;

  @IsDateString()
  public readonly endDate: string;

  @ValidateNested()
  @Type(() => EventLocationDto)
  public readonly location: EventLocationDto;

  @IsArray()
  @IsString({ each: true })
  public readonly imageUrls: string[];

  @IsString()
  public readonly titleImageUrl: string;
} 