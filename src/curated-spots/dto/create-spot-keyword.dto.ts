import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSpotKeywordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly name: string;
}
