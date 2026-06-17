export interface PassScanRecord {
  readonly id: string;
  readonly userId: string;
  readonly customerId: string;
  readonly businessId: string;
  readonly businessName: string;
  readonly scannedAt: string;
  /** Partner benefit text valid at the time of the scan. */
  readonly benefit: string;
  /** Amount recorded by the partner at scan time (optional). */
  readonly price?: number | null;
  readonly numberOfPeople?: number | null;
}

export interface PassScanRecordProps {
  id: string;
  userId: string;
  customerId: string;
  businessId: string;
  businessName: string;
  scannedAt: string;
  benefit: string;
  price?: number | null;
  numberOfPeople?: number | null;
}
