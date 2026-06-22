import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import {
  CuratedSpotsUserRatingsSettings,
  CuratedSpotsUserRatingsSettingsProps,
} from '../../domain/entities/curated-spots-user-ratings-settings.entity';

@Injectable()
export class CuratedSpotsUserRatingsSettingsService {
  private readonly logger = new Logger(CuratedSpotsUserRatingsSettingsService.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'curated_spots_user_ratings_settings';

  constructor(private readonly firebaseService: FirebaseService) {}

  async getSettings(): Promise<CuratedSpotsUserRatingsSettings> {
    this.logger.debug('Getting curated spots user ratings settings');
    return this.get();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(
    isEnabled: boolean,
    updatedBy?: string,
  ): Promise<CuratedSpotsUserRatingsSettings> {
    this.logger.debug(
      `Updating curated spots user ratings settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const current = await this.get();
    const updated = current.update({ isEnabled }, updatedBy);
    return this.save(updated);
  }

  private toPlainObject(
    entity: CuratedSpotsUserRatingsSettings,
  ): Omit<CuratedSpotsUserRatingsSettingsProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toEntityProps(
    data: Record<string, unknown>,
    id: string,
  ): CuratedSpotsUserRatingsSettingsProps {
    const updatedAtRaw = data.updatedAt;
    const updatedAt =
      updatedAtRaw &&
      typeof updatedAtRaw === 'object' &&
      'toDate' in updatedAtRaw &&
      typeof (updatedAtRaw as { toDate: () => Date }).toDate === 'function'
        ? (updatedAtRaw as { toDate: () => Date }).toDate().toISOString()
        : String(updatedAtRaw ?? new Date().toISOString());
    return {
      id,
      isEnabled: data.isEnabled === true,
      updatedAt,
      updatedBy:
        data.updatedBy === undefined || data.updatedBy === null
          ? undefined
          : String(data.updatedBy),
    };
  }

  private async get(): Promise<CuratedSpotsUserRatingsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = CuratedSpotsUserRatingsSettings.createDefault();
        await this.save(defaultSettings);
        return defaultSettings;
      }
      return CuratedSpotsUserRatingsSettings.fromProps(
        this.toEntityProps((doc.data() ?? {}) as Record<string, unknown>, doc.id),
      );
    } catch (error) {
      this.logger.error(`Error getting curated spots user ratings settings: ${error.message}`);
      throw error;
    }
  }

  private async save(settings: CuratedSpotsUserRatingsSettings): Promise<CuratedSpotsUserRatingsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      await db
        .collection(this.collectionName)
        .doc(this.documentId)
        .set(this.toPlainObject(settings));
      return settings;
    } catch (error) {
      this.logger.error(`Error saving curated spots user ratings settings: ${error.message}`);
      throw error;
    }
  }
}
