import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  AppVersionRepository,
  APP_VERSION_REPOSITORY,
} from '../../domain/repositories/app-version.repository';
import { AppVersion } from '../../domain/entities/app-version.entity';

@Injectable()
export class AppVersionsService {
  private readonly logger = new Logger(AppVersionsService.name);

  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly appVersionRepository: AppVersionRepository,
  ) {}

  /**
   * Prüft, ob die übergebene Version ein Update benötigt
   * @param clientVersion Die Version vom Client im Format "X.Y.Z" oder "X.Y.Z (Build Nummer)"
   * @returns true wenn ein Update erforderlich ist, false wenn die Version aktuell ist
   */
  async checkVersion(clientVersion: string): Promise<boolean> {
    this.logger.log(`Checking version: ${clientVersion}`);

    const currentMinimumVersion = await this.appVersionRepository.findCurrent();
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

    const currentVersion = await this.appVersionRepository.findCurrent();
    if (currentVersion) {
      const updatedVersion = currentVersion.update({ minimumVersion });
      return await this.appVersionRepository.save(updatedVersion);
    } else {
      const newVersion = AppVersion.create({ minimumVersion });
      return await this.appVersionRepository.save(newVersion);
    }
  }

  /**
   * Gibt die aktuelle Mindestversion zurück
   */
  async getMinimumVersion(): Promise<AppVersion | null> {
    return await this.appVersionRepository.findCurrent();
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
}
