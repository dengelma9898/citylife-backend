import { IsString, IsEmail, IsArray, IsBoolean, IsOptional } from 'class-validator';

export class CreateBusinessUserDto {
  @IsString()
  public readonly userId: string;

  @IsEmail()
  public readonly email: string;

  @IsString()
  public readonly businessId: string;

  @IsBoolean()
  public readonly needsReview: boolean;
}
