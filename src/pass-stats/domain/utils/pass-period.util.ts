import { DateTime } from 'luxon';
import { PassStatsPeriod } from '../interfaces/pass-stats-response.interface';

const BERLIN_TIMEZONE = 'Europe/Berlin';

export interface PassPeriodBounds {
  readonly periodStart: string;
  readonly periodEnd: string;
}

export function getPassPeriodBounds(period: PassStatsPeriod): PassPeriodBounds {
  const now = DateTime.now().setZone(BERLIN_TIMEZONE);
  if (period === 'month') {
    return {
      periodStart: now.startOf('month').toISO() || '',
      periodEnd: now.endOf('month').toISO() || '',
    };
  }
  return {
    periodStart: now.startOf('year').toISO() || '',
    periodEnd: now.endOf('year').toISO() || '',
  };
}
