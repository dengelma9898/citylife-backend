import { IsString, IsNotEmpty } from 'class-validator';

export class ChatroomDto {
  @IsString()
  @IsNotEmpty()
  public readonly cityId: string;

  @IsString()
  @IsNotEmpty()
  public readonly name: string;

  @IsString()
  @IsNotEmpty()
  public readonly iconName: string;
} 