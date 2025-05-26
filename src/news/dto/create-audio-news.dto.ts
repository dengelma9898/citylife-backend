import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAudioNewsDto {
  @IsString()
  @IsNotEmpty()
  public audioUrl: string;

  @IsNumber()
  @IsOptional()
  public readonly duration?: number;

  @IsString()
  @IsNotEmpty()
  public readonly authorId: string;

  @IsString()
  @IsOptional()
  public readonly caption?: string;
}
