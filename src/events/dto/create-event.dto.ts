import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @IsString()
  @IsNotEmpty()
  public readonly address: string;

  @IsNumber()
  public readonly latitude: number;

  @IsNumber()
  public readonly longitude: number;

  @IsDateString()
  public readonly startDate: string;

  @IsDateString()
  public readonly endDate: string;

} 