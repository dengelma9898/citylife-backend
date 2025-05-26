import { IsString, IsNotEmpty } from 'class-validator';

export class VotePollDto {
  @IsString()
  @IsNotEmpty()
  public readonly optionId: string;

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;
}
