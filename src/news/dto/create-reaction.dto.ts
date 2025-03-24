import { IsString, IsNotEmpty } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  public readonly reactionType: string;

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;
} 