import { IsString, IsEmail, IsArray, IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class BusinessUserDto {
  @IsString()
  public readonly id: string;

  @IsEmail()
  public readonly email: string;

  @IsArray()
  @IsString({ each: true })
  public readonly businessIds: string[];

  @IsDateString()
  public readonly createdAt: string;

  @IsDateString()
  public readonly updatedAt: string;

  @IsBoolean()
  public readonly isDeleted: boolean;

  @IsBoolean()
  public readonly needsReview: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public readonly eventIds?: string[];
}
