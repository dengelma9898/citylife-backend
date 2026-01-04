import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateFeatureRequestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description: string;
}

