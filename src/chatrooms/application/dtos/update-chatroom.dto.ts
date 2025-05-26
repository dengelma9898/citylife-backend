import { IsOptional, IsString } from 'class-validator';

export class UpdateChatroomDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
