import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import {
  DirectChatSettings,
  DirectChatSettingsProps,
} from '../../domain/entities/direct-chat-settings.entity';

@Injectable()
export class DirectChatSettingsService {
  private readonly logger = new Logger(DirectChatSettingsService.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'direct_chat_settings';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: DirectChatSettings): Omit<DirectChatSettingsProps, 'id'> {
    return toFirestoreData(entity);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntityProps(data: any, id: string): DirectChatSettingsProps {
    return {
      id,
      isEnabled: data.isEnabled ?? true,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date().toISOString(),
      updatedBy: data.updatedBy,
    };
  }

  private async getFromFirestore(): Promise<DirectChatSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = DirectChatSettings.createDefault();
        await this.saveToFirestore(defaultSettings);
        return defaultSettings;
      }
      return DirectChatSettings.fromProps(
        this.toEntityProps(doc.data(), doc.id),
      );
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
        .set(this.toPlainObject(settings));
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
    const updatedSettings = currentSettings.update({ isEnabled }, updatedBy);
    return this.saveToFirestore(updatedSettings);
  }
}
