import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { BusinessEventsSettingsRepository } from '../../domain/repositories/business-events-settings.repository';
import {
  BusinessEventsSettings,
  BusinessEventsSettingsProps,
} from '../../domain/entities/business-events-settings.entity';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseBusinessEventsSettingsRepository extends BusinessEventsSettingsRepository {
  private readonly logger = new Logger(FirebaseBusinessEventsSettingsRepository.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'business_events_settings';

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

  private toPlainObject(entity: BusinessEventsSettings): Omit<BusinessEventsSettingsProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toEntityProps(data: any, id: string): BusinessEventsSettingsProps {
    return {
      id,
      isEnabled: data.isEnabled ?? true,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date().toISOString(),
      updatedBy: data.updatedBy,
    };
  }

  async get(): Promise<BusinessEventsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = BusinessEventsSettings.createDefault();
        await this.save(defaultSettings);
        return defaultSettings;
      }
      return BusinessEventsSettings.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error getting business events settings: ${error.message}`);
      throw error;
    }
  }

  async save(settings: BusinessEventsSettings): Promise<BusinessEventsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      await db
        .collection(this.collectionName)
        .doc(this.documentId)
        .set(this.toPlainObject(settings));
      return settings;
    } catch (error) {
      this.logger.error(`Error saving business events settings: ${error.message}`);
      throw error;
    }
  }
}
