import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { AppVersion, AppVersionProps } from '../../domain/entities/app-version.entity';
import {
  VersionChangelog,
  VersionChangelogProps,
} from '../../domain/entities/version-changelog.entity';

@Injectable()
export class AppVersionsService {
  private readonly logger = new Logger(AppVersionsService.name);
  private readonly collection = 'app_versions';
  private readonly changelogsCollection = 'version_changelogs';
  private readonly currentVersionDocId = 'current';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toAppVersionProps(data: Record<string, unknown>, id: string): AppVersionProps {
    return {
      id,
      minimumVersion: data.minimumVersion as string,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  private toChangelogProps(data: Record<string, unknown>, id: string): VersionChangelogProps {
    return {
      id,
      version: data.version as string,
      content: data.content as string,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
      createdBy: data.createdBy as string,
    };
  }

  private async findCurrent(): Promise<AppVersion | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(this.currentVersionDocId).get();
    if (!doc.exists) {
      return null;
    }
    return AppVersion.fromProps(this.toAppVersionProps(doc.data() as Record<string, unknown>, this.currentVersionDocId));
  }

  private async saveAppVersion(appVersion: AppVersion): Promise<AppVersion> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(this.currentVersionDocId);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.update(toFirestoreData(appVersion));
    } else {
      await docRef.set({
        ...toFirestoreData(appVersion),
        id: this.currentVersionDocId,
      });
    }
    return AppVersion.fromProps({
      ...appVersion.toJSON(),
      id: this.currentVersionDocId,
    });
  }

  private async findChangelogByVersionInternal(version: string): Promise<VersionChangelog | null> {
    this.logger.debug(`Finding changelog for version: ${version}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.changelogsCollection)
      .where('version', '==', version)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return VersionChangelog.fromProps(this.toChangelogProps(doc.data() as Record<string, unknown>, doc.id));
  }

  private async saveChangelogInternal(changelog: VersionChangelog): Promise<VersionChangelog> {
    this.logger.debug(`Saving changelog for version: ${changelog.version}`);
    const db = this.firebaseService.getFirestore();
    const existingSnapshot = await db
      .collection(this.changelogsCollection)
      .where('version', '==', changelog.version)
      .limit(1)
      .get();
    if (!existingSnapshot.empty) {
      const existingDoc = existingSnapshot.docs[0];
      await db
        .collection(this.changelogsCollection)
        .doc(existingDoc.id)
        .update(toFirestoreData(changelog));
      return VersionChangelog.fromProps({
        ...changelog.toJSON(),
        id: existingDoc.id,
      });
    }
    const docRef = db.collection(this.changelogsCollection).doc(changelog.id);
    await docRef.set(toFirestoreData(changelog));
    return changelog;
  }

  private async findAllChangelogsInternal(): Promise<VersionChangelog[]> {
    this.logger.debug('Finding all changelogs');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.changelogsCollection).orderBy('version', 'desc').get();
    return snapshot.docs.map(doc =>
      VersionChangelog.fromProps(this.toChangelogProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async deleteChangelogInternal(version: string): Promise<void> {
    this.logger.debug(`Deleting changelog for version: ${version}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.changelogsCollection)
      .where('version', '==', version)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      await db.collection(this.changelogsCollection).doc(snapshot.docs[0].id).delete();
    }
  }

  /**
   * Prüft, ob die übergebene Version ein Update benötigt
   * @param clientVersion Die Version vom Client im Format "X.Y.Z" oder "X.Y.Z (Build Nummer)"
   * @returns true wenn ein Update erforderlich ist, false wenn die Version aktuell ist
   */
  async checkVersion(clientVersion: string): Promise<boolean> {
    this.logger.log(`Checking version: ${clientVersion}`);
    const currentMinimumVersion = await this.findCurrent();
    if (!currentMinimumVersion) {
      this.logger.warn('No minimum version configured, allowing all versions');
      return false;
    }
    const cleanedClientVersion = this.extractVersion(clientVersion);
    const requiresUpdate =
      this.compareVersions(cleanedClientVersion, currentMinimumVersion.minimumVersion) < 0;
    this.logger.log(
      `Version check: client=${cleanedClientVersion}, minimum=${currentMinimumVersion.minimumVersion}, requiresUpdate=${requiresUpdate}`,
    );
    return requiresUpdate;
  }

  /**
   * Setzt die Mindestversion für die App
   * @param minimumVersion Die Mindestversion im Format "X.Y.Z"
   */
  async setMinimumVersion(minimumVersion: string): Promise<AppVersion> {
    this.logger.log(`Setting minimum version to: ${minimumVersion}`);
    if (!this.isValidVersionFormat(minimumVersion)) {
      throw new Error(`Invalid version format: ${minimumVersion}. Expected format: X.Y.Z`);
    }
    const currentVersion = await this.findCurrent();
    if (currentVersion) {
      const updatedVersion = currentVersion.update({ minimumVersion });
      return await this.saveAppVersion(updatedVersion);
    }
    const newVersion = AppVersion.create({ minimumVersion });
    return await this.saveAppVersion(newVersion);
  }

  /**
   * Gibt die aktuelle Mindestversion zurück
   */
  async getMinimumVersion(): Promise<AppVersion | null> {
    return await this.findCurrent();
  }

  /**
   * Extrahiert die Version aus einem String, ignoriert Build-Nummern
   * @param versionString Format: "X.Y.Z" oder "X.Y.Z (Build Nummer)"
   * @returns Die Version im Format "X.Y.Z"
   */
  private extractVersion(versionString: string): string {
    const match = versionString.match(/^(\d+\.\d+\.\d+)/);
    if (!match) {
      throw new Error(
        `Invalid version format: ${versionString}. Expected format: X.Y.Z or X.Y.Z (Build Nummer)`,
      );
    }
    return match[1];
  }

  /**
   * Validiert das Versionsformat
   * @param version Die Version im Format "X.Y.Z"
   */
  private isValidVersionFormat(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Vergleicht zwei Versionen im Semantic Versioning Format
   * @param version1 Erste Version
   * @param version2 Zweite Version
   * @returns -1 wenn version1 < version2, 0 wenn gleich, 1 wenn version1 > version2
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      if (v1Part < v2Part) {
        return -1;
      }
      if (v1Part > v2Part) {
        return 1;
      }
    }
    return 0;
  }

  /**
   * Gibt den Changelog für eine bestimmte Version zurück
   * @param version Die Version im Format "X.Y.Z"
   * @returns Der Changelog oder null wenn nicht vorhanden
   */
  async getChangelogForVersion(version: string): Promise<VersionChangelog | null> {
    const cleanedVersion = this.extractVersion(version);
    this.logger.log(`Getting changelog for version: ${cleanedVersion}`);
    return await this.findChangelogByVersionInternal(cleanedVersion);
  }

  /**
   * Erstellt einen neuen Changelog für eine Version
   * @param version Die Version im Format "X.Y.Z"
   * @param content Der Changelog-Inhalt als Markdown
   * @param createdBy Die User-ID des Erstellers
   * @returns Der erstellte Changelog
   */
  async createChangelog(
    version: string,
    content: string,
    createdBy: string,
  ): Promise<VersionChangelog> {
    this.logger.log(`Creating changelog for version: ${version}`);
    if (!this.isValidVersionFormat(version)) {
      throw new Error(`Invalid version format: ${version}. Expected format: X.Y.Z`);
    }
    const existingChangelog = await this.findChangelogByVersionInternal(version);
    if (existingChangelog) {
      throw new ConflictException(`Changelog for version ${version} already exists`);
    }
    const changelog = VersionChangelog.create({
      version,
      content,
      createdBy,
    });
    return await this.saveChangelogInternal(changelog);
  }

  /**
   * Aktualisiert einen bestehenden Changelog
   * @param version Die Version im Format "X.Y.Z"
   * @param content Der neue Changelog-Inhalt als Markdown
   * @returns Der aktualisierte Changelog
   */
  async updateChangelog(version: string, content: string): Promise<VersionChangelog> {
    this.logger.log(`Updating changelog for version: ${version}`);
    const existingChangelog = await this.findChangelogByVersionInternal(version);
    if (!existingChangelog) {
      throw new NotFoundException(`Changelog for version ${version} not found`);
    }
    const updatedChangelog = existingChangelog.update({ content });
    return await this.saveChangelogInternal(updatedChangelog);
  }

  /**
   * Gibt alle Changelogs zurück
   * @returns Liste aller Changelogs, sortiert nach Version absteigend
   */
  async getAllChangelogs(): Promise<VersionChangelog[]> {
    this.logger.log('Getting all changelogs');
    return await this.findAllChangelogsInternal();
  }

  /**
   * Löscht einen Changelog für eine Version
   * @param version Die Version im Format "X.Y.Z"
   */
  async deleteChangelog(version: string): Promise<void> {
    this.logger.log(`Deleting changelog for version: ${version}`);
    const existingChangelog = await this.findChangelogByVersionInternal(version);
    if (!existingChangelog) {
      throw new NotFoundException(`Changelog for version ${version} not found`);
    }
    await this.deleteChangelogInternal(version);
  }
}
