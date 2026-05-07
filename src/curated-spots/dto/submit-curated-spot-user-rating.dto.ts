import { IsInt, Max, Min } from 'class-validator';

export class SubmitCuratedSpotUserRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  readonly score: number;
}
