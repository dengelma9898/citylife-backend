import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { DirectChatSettingsRepository } from '../../domain/repositories/direct-chat-settings.repository';
import {
  DirectChatSettings,
  DirectChatSettingsProps,
} from '../../domain/entities/direct-chat-settings.entity';

@Injectable()
export class FirebaseDirectChatSettingsRepository extends DirectChatSettingsRepository {
  private readonly logger = new Logger(FirebaseDirectChatSettingsRepository.name);
  private readonly collectionName = 'settings';
  private readonly documentId = 'direct_chat_settings';

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private toPlainObject(entity: DirectChatSettings): Omit<DirectChatSettingsProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEntityProps(data: any, id: string): DirectChatSettingsProps {
    return {
      id,
      isEnabled: data.isEnabled ?? true,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date().toISOString(),
      updatedBy: data.updatedBy,
    };
  }

  async get(): Promise<DirectChatSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(this.documentId).get();
      if (!doc.exists) {
        const defaultSettings = DirectChatSettings.createDefault();
        await this.save(defaultSettings);
        return defaultSettings;
      }
      return DirectChatSettings.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error getting direct chat settings: ${error.message}`);
      throw error;
    }
  }

  async save(settings: DirectChatSettings): Promise<DirectChatSettings> {
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
}
