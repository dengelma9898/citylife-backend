import { AppVersion } from '../entities/app-version.entity';
import { VersionChangelog } from '../entities/version-changelog.entity';

export const APP_VERSION_REPOSITORY = 'APP_VERSION_REPOSITORY';

export interface AppVersionRepository {
  findCurrent(): Promise<AppVersion | null>;
  save(appVersion: AppVersion): Promise<AppVersion>;
  findChangelogByVersion(version: string): Promise<VersionChangelog | null>;
  saveChangelog(changelog: VersionChangelog): Promise<VersionChangelog>;
  findAllChangelogs(): Promise<VersionChangelog[]>;
  deleteChangelog(version: string): Promise<void>;
}
