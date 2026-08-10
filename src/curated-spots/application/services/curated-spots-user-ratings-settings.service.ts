import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { CuratedSpotsUserRatingsSettings } from '../../interfaces/curated-spots-user-ratings-settings.interface';

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
    const updated: CuratedSpotsUserRatingsSettings = {
      ...current,
      isEnabled,
      updatedBy: updatedBy || current.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    return this.save(updated);
  }

  private toSettings(data: Record<string, unknown>, id: string): CuratedSpotsUserRatingsSettings {
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

  private createDefaultSettings(): CuratedSpotsUserRatingsSettings {
    return {
      id: this.documentId,
      isEnabled: false,
      updatedAt: new Date().toISOString(),
    };
  }

  private async get(): Promise<CuratedSpotsUserRatingsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = this.createDefaultSettings();
        await this.save(defaultSettings);
        return defaultSettings;
      }
      return this.toSettings((doc.data() ?? {}) as Record<string, unknown>, doc.id);
    } catch (error) {
      this.logger.error(`Error getting curated spots user ratings settings: ${error.message}`);
      throw error;
    }
  }

  private async save(
    settings: CuratedSpotsUserRatingsSettings,
  ): Promise<CuratedSpotsUserRatingsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      await db
        .collection(this.collectionName)
        .doc(this.documentId)
        .set(toFirestoreData(settings as unknown as Record<string, unknown>));
      return settings;
    } catch (error) {
      this.logger.error(`Error saving curated spots user ratings settings: ${error.message}`);
      throw error;
    }
  }
}
