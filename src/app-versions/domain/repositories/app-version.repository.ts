import { AppVersion } from '../entities/app-version.entity';

export const APP_VERSION_REPOSITORY = 'APP_VERSION_REPOSITORY';

export interface AppVersionRepository {
  findCurrent(): Promise<AppVersion | null>;
  save(appVersion: AppVersion): Promise<AppVersion>;
}

