import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { AppVersion, AppVersionProps } from '../../domain/entities/app-version.entity';
import {
  VersionChangelog,
  VersionChangelogProps,
} from '../../domain/entities/version-changelog.entity';
import { AppVersionRepository } from '../../domain/repositories/app-version.repository';

@Injectable()
export class FirebaseAppVersionRepository implements AppVersionRepository {
  private readonly logger = new Logger(FirebaseAppVersionRepository.name);
  private readonly COLLECTION_NAME = 'app_versions';
  private readonly CHANGELOGS_COLLECTION = 'version_changelogs';
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

  private toChangelogPlainObject(
    entity: VersionChangelog,
  ): Omit<VersionChangelogProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toChangelogProps(data: any, id: string): VersionChangelogProps {
    return {
      id,
      version: data.version,
      content: data.content,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
    };
  }

  async findChangelogByVersion(version: string): Promise<VersionChangelog | null> {
    try {
      this.logger.debug(`Finding changelog for version: ${version}`);
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.CHANGELOGS_COLLECTION)
        .where('version', '==', version)
        .limit(1)
        .get();
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return VersionChangelog.fromProps(this.toChangelogProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding changelog for version ${version}: ${error.message}`);
      throw error;
    }
  }

  async saveChangelog(changelog: VersionChangelog): Promise<VersionChangelog> {
    try {
      this.logger.debug(`Saving changelog for version: ${changelog.version}`);
      const db = this.firebaseService.getFirestore();
      const existingSnapshot = await db
        .collection(this.CHANGELOGS_COLLECTION)
        .where('version', '==', changelog.version)
        .limit(1)
        .get();
      if (!existingSnapshot.empty) {
        const existingDoc = existingSnapshot.docs[0];
        await db
          .collection(this.CHANGELOGS_COLLECTION)
          .doc(existingDoc.id)
          .update(this.toChangelogPlainObject(changelog));
        return VersionChangelog.fromProps({
          ...changelog.toJSON(),
          id: existingDoc.id,
        });
      } else {
        const docRef = db.collection(this.CHANGELOGS_COLLECTION).doc(changelog.id);
        await docRef.set(this.toChangelogPlainObject(changelog));
        return changelog;
      }
    } catch (error) {
      this.logger.error(`Error saving changelog for version ${changelog.version}: ${error.message}`);
      throw error;
    }
  }

  async findAllChangelogs(): Promise<VersionChangelog[]> {
    try {
      this.logger.debug('Finding all changelogs');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.CHANGELOGS_COLLECTION)
        .orderBy('version', 'desc')
        .get();
      return snapshot.docs.map(doc =>
        VersionChangelog.fromProps(this.toChangelogProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding all changelogs: ${error.message}`);
      throw error;
    }
  }

  async deleteChangelog(version: string): Promise<void> {
    try {
      this.logger.debug(`Deleting changelog for version: ${version}`);
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.CHANGELOGS_COLLECTION)
        .where('version', '==', version)
        .limit(1)
        .get();
      if (!snapshot.empty) {
        await db.collection(this.CHANGELOGS_COLLECTION).doc(snapshot.docs[0].id).delete();
      }
    } catch (error) {
      this.logger.error(`Error deleting changelog for version ${version}: ${error.message}`);
      throw error;
    }
  }
}
