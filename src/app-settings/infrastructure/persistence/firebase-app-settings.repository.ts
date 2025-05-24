import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { FirebaseService } from 'src/firebase/firebase.service';
import { AppSettings, AppSettingsProps } from '../../domain/entities/app-settings.entity';
import { AppSettingsRepository } from '../../domain/repositories/app-settings.repository';

@Injectable()
export class FirebaseAppSettingsRepository implements AppSettingsRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

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

  private toPlainObject(entity: AppSettings): Omit<AppSettingsProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toAppSettingsProps(data: any, id: string): AppSettingsProps {
    return {
      id,
      preferences: data.preferences || []
    };
  }

  async findAll(): Promise<AppSettings[]> {
    const db = this.firebaseService.getClientFirestore();
    const settingsCol = collection(db, 'app_settings');
    const snapshot = await getDocs(settingsCol);
    
    return snapshot.docs.map(doc => 
      AppSettings.fromProps(this.toAppSettingsProps(doc.data(), doc.id))
    );
  }

  async findById(id: string): Promise<AppSettings | null> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'app_settings', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return AppSettings.fromProps(
      this.toAppSettingsProps(docSnap.data(), docSnap.id)
    );
  }
} 