import { DateTime } from 'luxon';
import { Event } from '../interfaces/event.interface';

const BERLIN_ZONE = 'Europe/Berlin';

export function monthYearToHtml5(monthYear: string | undefined | null): string {
  if (!monthYear) {
    return '';
  }
  const parts = monthYear.split('.');
  if (parts.length !== 2) {
    return '';
  }
  const [month, year] = parts;
  if (!month || !year || month.length > 2 || year.length !== 4) {
    return '';
  }
  return `${year}-${month.padStart(2, '0')}`;
}

export function monthYearToDate(monthYear: string | undefined | null): Date | null {
  if (!monthYear) {
    return null;
  }
  const html5Format = monthYearToHtml5(monthYear);
  if (!html5Format) {
    return null;
  }
  const parsed = new Date(`${html5Format}-01`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function hasDateInfo(event: Event): boolean {
  return (event.dailyTimeSlots?.length ?? 0) > 0 || !!event.monthYear;
}

export function getEventStartDate(event: Event): Date | null {
  if (event.dailyTimeSlots?.length) {
    const parsed = new Date(event.dailyTimeSlots[0].date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (event.monthYear) {
    return monthYearToDate(event.monthYear);
  }
  return null;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isPastDate(date: Date): boolean {
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
}

export function isFutureDate(date: Date): boolean {
  const today = startOfDay(new Date());
  return startOfDay(date) > today;
}

export function isWithinDateInterval(now: Date, start: Date, end: Date): boolean {
  const normalizedNow = startOfDay(now).getTime();
  const normalizedStart = startOfDay(start).getTime();
  const normalizedEnd = startOfDay(end).getTime();
  return normalizedNow >= normalizedStart && normalizedNow <= normalizedEnd;
}

export function formatSlotMonthKey(date: string): string {
  const parsed = DateTime.fromISO(date, { zone: BERLIN_ZONE });
  if (!parsed.isValid) {
    return '';
  }
  return parsed.toFormat('yyyy-MM');
}

export function getSlotCalendarWeek(date: string): { year: number; week: string } | null {
  const parsed = DateTime.fromISO(date, { zone: BERLIN_ZONE });
  if (!parsed.isValid) {
    return null;
  }
  return {
    year: parsed.year,
    week: String(parsed.weekNumber),
  };
}

export function formatMonthYearLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  if (!year || !month) {
    return monthKey;
  }
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export function buildMonthOptions(events: Event[]): { key: string; label: string }[] {
  const monthKeys = new Set<string>();
  for (const event of events) {
    if (event.dailyTimeSlots?.length) {
      for (const slot of event.dailyTimeSlots) {
        const monthKey = formatSlotMonthKey(slot.date);
        if (monthKey) {
          monthKeys.add(monthKey);
        }
      }
    } else if (event.monthYear) {
      const parsedMonthYearDate = monthYearToDate(event.monthYear);
      if (parsedMonthYearDate) {
        const monthKey = `${parsedMonthYearDate.getFullYear()}-${String(parsedMonthYearDate.getMonth() + 1).padStart(2, '0')}`;
        monthKeys.add(monthKey);
      }
    }
  }
  return Array.from(monthKeys)
    .sort((a, b) => b.localeCompare(a))
    .map(monthKey => ({
      key: monthKey,
      label: formatMonthYearLabel(monthKey),
    }));
}
