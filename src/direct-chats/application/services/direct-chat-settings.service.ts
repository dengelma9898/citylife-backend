import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { DirectChatSettings } from '../../interfaces/direct-chat-settings.interface';

@Injectable()
export class DirectChatSettingsService {
  private readonly logger = new Logger(DirectChatSettingsService.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'direct_chat_settings';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toSettings(data: Record<string, unknown>, id: string): DirectChatSettings {
    const updatedAt = data.updatedAt as { toDate?: () => Date } | string | undefined;
    return {
      id,
      isEnabled: (data.isEnabled as boolean) ?? true,
      updatedAt:
        typeof updatedAt === 'object' && updatedAt?.toDate
          ? updatedAt.toDate().toISOString()
          : (updatedAt as string) || new Date().toISOString(),
      updatedBy: data.updatedBy as string | undefined,
    };
  }

  private createDefaultSettings(): DirectChatSettings {
    return {
      id: this.documentId,
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  private async getFromFirestore(): Promise<DirectChatSettings> {
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
      this.logger.error(`Error getting direct chat settings: ${error.message}`);
      throw error;
    }
  }

  private async saveToFirestore(settings: DirectChatSettings): Promise<DirectChatSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      await db
        .collection(this.collectionName)
        .doc(this.documentId)
        .set(toFirestoreData(settings as unknown as Record<string, unknown>));
      return settings;
    } catch (error) {
      this.logger.error(`Error saving direct chat settings: ${error.message}`);
      throw error;
    }
  }

  async getSettings(): Promise<DirectChatSettings> {
    this.logger.debug('Getting direct chat settings');
    return this.getFromFirestore();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(isEnabled: boolean, updatedBy?: string): Promise<DirectChatSettings> {
    this.logger.debug(
      `Updating direct chat settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const currentSettings = await this.getFromFirestore();
    const updatedSettings: DirectChatSettings = {
      ...currentSettings,
      isEnabled,
      updatedBy: updatedBy || currentSettings.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    return this.saveToFirestore(updatedSettings);
  }
}
