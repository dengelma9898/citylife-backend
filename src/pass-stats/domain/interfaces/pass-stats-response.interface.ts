import { PassScanRecord } from './pass-scan-record.interface';

export type PassStatsPeriod = 'month' | 'year';

export interface PassStatsResponse {
  readonly period: PassStatsPeriod;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly benefitUseCount: number;
  readonly recentScans: PassScanRecord[];
}
