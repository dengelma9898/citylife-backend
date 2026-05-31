import { DateTime } from 'luxon';
import {
  PASS_STATS_TEST_USER_ID,
  buildPassStatsTestSeedRecords,
} from './pass-stats-test-seed.data';

describe('buildPassStatsTestSeedRecords', () => {
  it('should generate scans across multiple months and years', () => {
    const records = buildPassStatsTestSeedRecords(
      PASS_STATS_TEST_USER_ID,
      `NSP-${PASS_STATS_TEST_USER_ID}`,
    );
    expect(records.length).toBeGreaterThan(30);
    const months = new Set(
      records.map(record =>
        DateTime.fromISO(record.scannedAt).setZone('Europe/Berlin').toFormat('yyyy-MM'),
      ),
    );
    expect(months.size).toBeGreaterThan(12);
    const years = new Set(
      records.map(record =>
        DateTime.fromISO(record.scannedAt).setZone('Europe/Berlin').year.toString(),
      ),
    );
    expect(years.size).toBeGreaterThanOrEqual(2);
    const currentMonth = DateTime.now().setZone('Europe/Berlin').toFormat('yyyy-MM');
    const currentMonthScans = records.filter(record =>
      DateTime.fromISO(record.scannedAt).setZone('Europe/Berlin').toFormat('yyyy-MM') ===
      currentMonth,
    );
    expect(currentMonthScans.length).toBeGreaterThanOrEqual(4);
  });

  it('should include price and benefit on each record', () => {
    const records = buildPassStatsTestSeedRecords('user-1', 'NSP-user-1');
    for (const record of records) {
      expect(record.benefit).toBeTruthy();
      expect(record.businessName).toBeTruthy();
      expect(record.userId).toBe('user-1');
    }
    expect(records.some(record => record.price !== null && record.price !== undefined)).toBe(true);
    expect(records.some(record => record.price === null)).toBe(true);
  });
});
