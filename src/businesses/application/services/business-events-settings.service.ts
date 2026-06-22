import { Injectable, Logger } from '@nestjs/common';
import {
  BusinessEventsSettings,
  BusinessEventsSettingsProps,
} from '../../domain/entities/business-events-settings.entity';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class BusinessEventsSettingsService {
  private readonly logger = new Logger(BusinessEventsSettingsService.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'business_events_settings';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: BusinessEventsSettings): Omit<BusinessEventsSettingsProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toEntityProps(data: Record<string, unknown>, id: string): BusinessEventsSettingsProps {
    const updatedAt = data.updatedAt as { toDate?: () => Date } | string | undefined;
    const resolvedUpdatedAt =
      typeof updatedAt === 'object' && updatedAt?.toDate
        ? updatedAt.toDate().toISOString()
        : (updatedAt as string) || new Date().toISOString();
    return {
      id,
      isEnabled: (data.isEnabled as boolean) ?? true,
      updatedAt: resolvedUpdatedAt,
      updatedBy: data.updatedBy as string | undefined,
    };
  }

  private async getFromFirestore(): Promise<BusinessEventsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = BusinessEventsSettings.createDefault();
        await this.saveToFirestore(defaultSettings);
        return defaultSettings;
      }
      return BusinessEventsSettings.fromProps(
        this.toEntityProps(doc.data() as Record<string, unknown>, doc.id),
      );
    } catch (error) {
      this.logger.error(`Error getting business events settings: ${error.message}`);
      throw error;
    }
  }

  private async saveToFirestore(settings: BusinessEventsSettings): Promise<BusinessEventsSettings> {
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

  async getSettings(): Promise<BusinessEventsSettings> {
    this.logger.debug('Getting business events settings');
    return this.getFromFirestore();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(isEnabled: boolean, updatedBy?: string): Promise<BusinessEventsSettings> {
    this.logger.debug(
      `Updating business events settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const currentSettings = await this.getFromFirestore();
    const updatedSettings = currentSettings.update({ isEnabled }, updatedBy);
    return this.saveToFirestore(updatedSettings);
  }
}
