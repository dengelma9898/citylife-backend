import { IsNotEmpty, IsString } from 'class-validator';

export class ReactionDto {
  @IsNotEmpty()
  @IsString()
  type!: string;
}
