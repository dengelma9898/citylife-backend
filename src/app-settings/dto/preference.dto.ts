import { IsString, IsArray } from 'class-validator';

export class PreferenceDto {
  @IsString()
  public readonly id: string;

  @IsArray()
  @IsString({ each: true })
  public readonly preferences: string[];
}
