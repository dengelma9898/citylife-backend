import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChatroomDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
