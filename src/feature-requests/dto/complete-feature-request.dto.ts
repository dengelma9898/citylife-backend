import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';

export enum CompletionAction {
  COMPLETE = 'complete',
  REJECT = 'reject',
}

export class CompleteFeatureRequestDto {
  @IsEnum(CompletionAction)
  @IsNotEmpty()
  action: CompletionAction;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
