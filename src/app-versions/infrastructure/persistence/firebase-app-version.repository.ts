import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { AppVersion, AppVersionProps } from '../../domain/entities/app-version.entity';
import { AppVersionRepository } from '../../domain/repositories/app-version.repository';

@Injectable()
export class FirebaseAppVersionRepository implements AppVersionRepository {
  private readonly COLLECTION_NAME = 'app_versions';
  private readonly CURRENT_VERSION_DOC_ID = 'current';

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

  private toPlainObject(entity: AppVersion): Omit<AppVersionProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toAppVersionProps(data: any, id: string): AppVersionProps {
    return {
      id,
      minimumVersion: data.minimumVersion,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findCurrent(): Promise<AppVersion | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION_NAME).doc(this.CURRENT_VERSION_DOC_ID).get();

    if (!doc.exists) {
      return null;
    }

    return AppVersion.fromProps(this.toAppVersionProps(doc.data(), this.CURRENT_VERSION_DOC_ID));
  }

  async save(appVersion: AppVersion): Promise<AppVersion> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION_NAME).doc(this.CURRENT_VERSION_DOC_ID);
    const doc = await docRef.get();

    if (doc.exists) {
      await docRef.update(this.toPlainObject(appVersion));
      return AppVersion.fromProps({
        ...appVersion.toJSON(),
        id: this.CURRENT_VERSION_DOC_ID,
      });
    } else {
      await docRef.set({
        ...this.toPlainObject(appVersion),
        id: this.CURRENT_VERSION_DOC_ID,
      });
      return AppVersion.fromProps({
        ...appVersion.toJSON(),
        id: this.CURRENT_VERSION_DOC_ID,
      });
    }
  }
}
