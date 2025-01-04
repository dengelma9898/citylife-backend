import { IsString, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';

export class CityDto {
  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @IsNumber()
  public readonly latitude: number;

  @IsNumber()
  public readonly longitude: number;

  @IsDateString()
  public readonly createdAt: string;

  @IsDateString()
  public readonly updatedAt: string;
} 