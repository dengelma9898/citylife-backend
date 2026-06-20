import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { PassScanRecord, PassScanRecordProps } from '../../domain/interfaces/pass-scan-record.interface';

import { removeUndefined } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebasePassScanRepository {
  private readonly passScansSubcollection = 'pass-scans';
  /** Dev-only marker: pass-scans/{this id} – not a real scan. */
  public readonly devSeedMarkerDocId = '_dev-pass-stats-seed';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toOptionalNumber(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'number' ? value : null;
  }

  private toRecord(data: Record<string, unknown>, id: string): PassScanRecord {
    return {
      id,
      userId: data.userId as string,
      customerId: data.customerId as string,
      businessId: data.businessId as string,
      businessName: data.businessName as string,
      scannedAt: data.scannedAt as string,
      benefit: data.benefit as string,
      price: this.toOptionalNumber(data.price),
      numberOfPeople: this.toOptionalNumber(data.numberOfPeople),
    };
  }

  public async hasDevSeedMarker(userId: string): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const doc = await db
      .collection('users')
      .doc(userId)
      .collection(this.passScansSubcollection)
      .doc(this.devSeedMarkerDocId)
      .get();
    return doc.exists;
  }

  public async setDevSeedMarker(userId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db
      .collection('users')
      .doc(userId)
      .collection(this.passScansSubcollection)
      .doc(this.devSeedMarkerDocId)
      .set({
        seededAt: new Date().toISOString(),
        purpose: 'dev-pass-stats-test-data',
      });
  }

  public async createIfNotExists(userId: string, record: PassScanRecordProps): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const docRef = db
      .collection('users')
      .doc(userId)
      .collection(this.passScansSubcollection)
      .doc(record.id);
    const existing = await docRef.get();
    if (existing.exists) {
      return false;
    }
    const plain = removeUndefined({ ...record } as Record<string, unknown>);
    await docRef.set(plain);
    return true;
  }

  public async findByUserIdInPeriod(
    userId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<PassScanRecord[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection(this.passScansSubcollection)
      .where('scannedAt', '>=', periodStart)
      .where('scannedAt', '<=', periodEnd)
      .orderBy('scannedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => this.toRecord(doc.data(), doc.id));
  }
}
