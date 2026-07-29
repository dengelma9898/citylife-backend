import { Injectable, Logger } from '@nestjs/common';
import { BusinessEventsSettings } from '../../interfaces/business-events-settings.interface';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class BusinessEventsSettingsService {
  private readonly logger = new Logger(BusinessEventsSettingsService.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'business_events_settings';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toSettings(data: Record<string, unknown>, id: string): BusinessEventsSettings {
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

  private createDefaultSettings(): BusinessEventsSettings {
    return {
      id: this.documentId,
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  private async getFromFirestore(): Promise<BusinessEventsSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = this.createDefaultSettings();
        await this.saveToFirestore(defaultSettings);
        return defaultSettings;
      }
      return this.toSettings(doc.data() as Record<string, unknown>, doc.id);
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
        .set(toFirestoreData(settings as unknown as Record<string, unknown>));
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
    const updatedSettings: BusinessEventsSettings = {
      ...currentSettings,
      isEnabled,
      updatedBy: updatedBy || currentSettings.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    return this.saveToFirestore(updatedSettings);
  }
}
