import { IsString, IsEmail, IsEnum, IsArray, IsInt, Min, Max, IsOptional } from 'class-validator';
import { UserType } from '../enums/user-type.enum';

export class CreateUserProfileDto {
  @IsEmail()
  public readonly email: string;

  @IsString()
  public readonly name: string;

  @IsString()
  @IsOptional()
  public readonly profilePictureUrl?: string;

  @IsArray()
  @IsString({ each: true })
  public readonly preferences: string[];

  @IsString()
  public readonly language: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  public readonly livingInCitySinceYear: number;
}
