import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { AppSettings, AppSettingsProps } from '../../domain/entities/app-settings.entity';
import { AppSettingsRepository } from '../../domain/repositories/app-settings.repository';

import { removeUndefined, toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseAppSettingsRepository implements AppSettingsRepository {
  private readonly logger = new Logger(FirebaseAppSettingsRepository.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: AppSettings): Omit<AppSettingsProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toAppSettingsProps(data: any, id: string): AppSettingsProps {
    return {
      id,
      preferences: data.preferences || [],
    };
  }

  async findAll(): Promise<AppSettings[]> {
    try {
      this.logger.debug('Attempting to find all app settings');
      const db = this.firebaseService.getFirestore();
      const settingsCol = db.collection('app_settings');
      const snapshot = await settingsCol.get();

      return snapshot.docs.map(doc =>
        AppSettings.fromProps(this.toAppSettingsProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error('Error finding all app settings:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<AppSettings | null> {
    try {
      this.logger.debug(`Attempting to find app settings with id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const docRef = db.collection('app_settings').doc(id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        this.logger.debug(`App settings with id ${id} not found`);
        return null;
      }

      return AppSettings.fromProps(this.toAppSettingsProps(docSnap.data(), docSnap.id));
    } catch (error) {
      this.logger.error(`Error finding app settings with id ${id}:`, error);
      throw error;
    }
  }
}
