import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpotsUserRatingsSettingsRepository } from '../../domain/repositories/curated-spots-user-ratings-settings.repository';
import {
  CuratedSpotsUserRatingsSettings,
  CuratedSpotsUserRatingsSettingsProps,
} from '../../domain/entities/curated-spots-user-ratings-settings.entity';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseCuratedSpotsUserRatingsSettingsRepository extends CuratedSpotsUserRatingsSettingsRepository {
  private readonly logger = new Logger(FirebaseCuratedSpotsUserRatingsSettingsRepository.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'curated_spots_user_ratings_settings';

  constructor(private readonly firebaseService: FirebaseService) {
    super();
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

  async get(): Promise<CuratedSpotsUserRatingsSettings> {
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

  async save(settings: CuratedSpotsUserRatingsSettings): Promise<CuratedSpotsUserRatingsSettings> {
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
