import { IsNotEmpty, IsString } from 'class-validator';

export class CreateKeywordDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
