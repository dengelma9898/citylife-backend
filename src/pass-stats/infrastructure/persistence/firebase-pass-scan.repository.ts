import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { PassScanRecord, PassScanRecordProps } from '../../domain/interfaces/pass-scan-record.interface';

@Injectable()
export class FirebasePassScanRepository {
  private readonly passScansSubcollection = 'pass-scans';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

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
    const plain = this.removeUndefined({ ...record } as Record<string, unknown>);
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
