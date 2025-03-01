import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateChatroomDto {
  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @IsString()
  @IsOptional()
  public readonly imageUrl?: string;

  @IsArray()
  @IsString({ each: true })
  public readonly participants: string[];
} 