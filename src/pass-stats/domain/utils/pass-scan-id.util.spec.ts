import { buildPassScanId } from './pass-scan-id.util';

describe('buildPassScanId', () => {
  it('should return deterministic id for same inputs', () => {
    const id1 = buildPassScanId('biz-1', 'NSP-user1', '2026-05-01T12:00:00+02:00');
    const id2 = buildPassScanId('biz-1', 'NSP-user1', '2026-05-01T12:00:00+02:00');
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(32);
  });

  it('should return different ids for different scan times', () => {
    const id1 = buildPassScanId('biz-1', 'NSP-user1', '2026-05-01T12:00:00+02:00');
    const id2 = buildPassScanId('biz-1', 'NSP-user1', '2026-05-01T13:00:00+02:00');
    expect(id1).not.toBe(id2);
  });
});
