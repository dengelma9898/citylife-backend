import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { TaxiStandRepository, TAXI_STAND_REPOSITORY } from '../../domain/repositories/taxi-stand.repository';
import { FirebaseService } from '../../../firebase/firebase.service';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';

export interface FeatureStatus {
  isFeatureActive: boolean;
  startDate?: string;
}

@Injectable()
export class TaxiStandsFeatureService {
  private readonly logger = new Logger(TaxiStandsFeatureService.name);
  private readonly FEATURE_STATUS_DOC_ID = 'feature-status';
  private readonly COLLECTION = 'taxiStands';

  constructor(
    @Inject(TAXI_STAND_REPOSITORY)
    private readonly taxiStandRepository: TaxiStandRepository,
    private readonly firebaseService: FirebaseService,
  ) {}

  async getFeatureStatus(): Promise<FeatureStatus> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(this.FEATURE_STATUS_DOC_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { isFeatureActive: false };
    }
    const data = doc.data();
    return {
      isFeatureActive: data?.isFeatureActive || false,
      startDate: data?.startDate,
    };
  }

  async isFeatureActive(): Promise<boolean> {
    const status = await this.getFeatureStatus();
    if (!status.isFeatureActive) {
      return false;
    }
    if (status.startDate) {
      const today = new Date().toISOString().split('T')[0];
      return today >= status.startDate;
    }
    return true;
  }

  async setFeatureStatus(isFeatureActive: boolean, startDate?: string): Promise<FeatureStatus> {
    this.logger.log(`Setting taxi stands feature status to: ${isFeatureActive}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(this.FEATURE_STATUS_DOC_ID);
    const updateData: Record<string, any> = {
      isFeatureActive,
      updatedAt: new Date().toISOString(),
    };
    if (startDate !== undefined) {
      updateData.startDate = startDate;
    }
    await docRef.set(updateData, { merge: true });
    this.logger.log(`Taxi stands feature status successfully set to: ${isFeatureActive}`);
    return { isFeatureActive, startDate };
  }

  async trackPhoneClick(taxiStandId: string): Promise<TaxiStand> {
    this.logger.log(`Tracking phone click for taxi stand ${taxiStandId}`);
    const taxiStand = await this.taxiStandRepository.findById(taxiStandId);
    if (!taxiStand) {
      throw new NotFoundException('Taxi stand not found');
    }
    const updatedTaxiStand = taxiStand.addPhoneClick();
    return this.taxiStandRepository.update(taxiStandId, updatedTaxiStand);
  }
}
