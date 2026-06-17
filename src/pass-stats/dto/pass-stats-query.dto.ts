import { IsEnum, IsOptional } from 'class-validator';
import { PassStatsPeriod } from '../domain/interfaces/pass-stats-response.interface';

export class PassStatsQueryDto {
  @IsOptional()
  @IsEnum(['month', 'year'])
  public readonly period?: PassStatsPeriod;
}
