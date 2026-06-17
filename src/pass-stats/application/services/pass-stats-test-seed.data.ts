import { DateTime } from 'luxon';
import { PassScanRecordProps } from '../../domain/interfaces/pass-scan-record.interface';
import { buildPassScanId } from '../../domain/utils/pass-scan-id.util';

const BERLIN = 'Europe/Berlin';

export const PASS_STATS_TEST_USER_ID = 'yZTZZ4bRhnORR3Oy2jl2mJLl0ef2';

const SEED_BUSINESSES = [
  { id: 'seed-biz-cafe', name: 'Café Rösterei', benefit: 'Kaffee gratis' },
  { id: 'seed-biz-bistro', name: 'Bistro am Markt', benefit: '10 % auf die Rechnung' },
  { id: 'seed-biz-bakery', name: 'Bäckerei Sonnenschein', benefit: '2. Brötchen gratis' },
  { id: 'seed-biz-restaurant', name: 'Restaurant Altstadt', benefit: 'Vorspeise gratis' },
  { id: 'seed-biz-bar', name: 'Bar 904', benefit: '1 Drink gratis' },
] as const;

/**
 * Builds deterministic fake pass-scans from ~2 years ago through the current month (Berlin time).
 */
export function buildPassStatsTestSeedRecords(
  userId: string,
  customerId: string,
): PassScanRecordProps[] {
  const now = DateTime.now().setZone(BERLIN);
  const records: PassScanRecordProps[] = [];
  let monthCursor = now.minus({ years: 2 }).startOf('month');
  let scanIndex = 0;
  while (monthCursor <= now.startOf('month')) {
    const isCurrentMonth = monthCursor.hasSame(now, 'month');
    const monthsAgo = now.diff(monthCursor, 'months').months;
    const scansThisMonth = isCurrentMonth ? 5 : monthsAgo <= 3 ? 3 : monthsAgo <= 12 ? 2 : 1;
    for (let dayOffset = 0; dayOffset < scansThisMonth; dayOffset += 1) {
      const business = SEED_BUSINESSES[scanIndex % SEED_BUSINESSES.length];
      const day = Math.min(26, 4 + dayOffset * 6);
      const scannedAt =
        monthCursor.set({ day, hour: 11 + dayOffset, minute: 15 * dayOffset }).toISO() || '';
      const price = scanIndex % 4 === 0 ? null : 12 + (scanIndex % 7) * 8;
      const scanId = buildPassScanId(business.id, customerId, scannedAt);
      records.push({
        id: scanId,
        userId,
        customerId,
        businessId: business.id,
        businessName: business.name,
        scannedAt,
        benefit: business.benefit,
        price,
        numberOfPeople: scanIndex % 3 === 0 ? 2 : 1,
      });
      scanIndex += 1;
    }
    monthCursor = monthCursor.plus({ months: 1 });
  }
  return records;
}
