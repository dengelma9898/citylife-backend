import { IsOptional, IsString } from 'class-validator';

export class UpdateKeywordDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
