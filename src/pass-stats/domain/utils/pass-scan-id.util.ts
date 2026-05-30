import { createHash } from 'crypto';

/**
 * Deterministic scan id for idempotent writes (duplicate scan requests).
 */
export function buildPassScanId(
  businessId: string,
  customerId: string,
  scannedAt: string,
): string {
  return createHash('sha256')
    .update(`${businessId}:${customerId}:${scannedAt}`)
    .digest('hex')
    .slice(0, 32);
}
