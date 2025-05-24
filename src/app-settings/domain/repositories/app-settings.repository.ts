import { AppSettings } from '../entities/app-settings.entity';

export const APP_SETTINGS_REPOSITORY = 'APP_SETTINGS_REPOSITORY';

export interface AppSettingsRepository {
  findAll(): Promise<AppSettings[]>;
  findById(id: string): Promise<AppSettings | null>;
} 