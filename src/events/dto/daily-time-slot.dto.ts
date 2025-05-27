import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
export class DailyTimeSlotDTO {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsString()
  @IsOptional()
  to?: string;
}
