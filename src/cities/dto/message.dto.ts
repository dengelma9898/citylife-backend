import { IsString, IsNotEmpty, IsDateString, IsArray, IsOptional } from 'class-validator';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  public readonly cityId: string;

  @IsString()
  @IsNotEmpty()
  public readonly chatroomId: string;

  @IsString()
  @IsNotEmpty()
  public readonly content: string;

  @IsString()
  @IsNotEmpty()
  public readonly senderId: string;

  @IsString()
  @IsNotEmpty()
  public readonly senderName: string;

  @IsDateString()
  public readonly timestamp: string;

  @IsDateString()
  @IsOptional()
  public readonly editedAt?: string | null;

  @IsArray()
  @IsString({ each: true })
  public readonly readBy: string[];
} 