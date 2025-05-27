import { IsNotEmpty, IsEnum } from 'class-validator';

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
}

export class UpdateMessageReactionDto {
  @IsNotEmpty()
  @IsEnum(ReactionType)
  type!: ReactionType;
}
