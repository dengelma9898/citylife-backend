import { DateTime } from 'luxon';
import { getPassPeriodBounds } from './pass-period.util';

describe('getPassPeriodBounds', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return current month bounds in Berlin timezone', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
    const bounds = getPassPeriodBounds('month');
    const start = DateTime.fromISO(bounds.periodStart).setZone('Europe/Berlin');
    const end = DateTime.fromISO(bounds.periodEnd).setZone('Europe/Berlin');
    expect(start.month).toBe(5);
    expect(start.day).toBe(1);
    expect(end.month).toBe(5);
    expect(end.day).toBe(31);
  });

  it('should return current year bounds in Berlin timezone', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-15T10:00:00.000Z'));
    const bounds = getPassPeriodBounds('year');
    const start = DateTime.fromISO(bounds.periodStart).setZone('Europe/Berlin');
    const end = DateTime.fromISO(bounds.periodEnd).setZone('Europe/Berlin');
    expect(start.year).toBe(2026);
    expect(start.month).toBe(1);
    expect(end.year).toBe(2026);
    expect(end.month).toBe(12);
  });
});
