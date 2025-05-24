import { Injectable, Inject } from '@nestjs/common';
import { AppSettings } from '../../domain/entities/app-settings.entity';
import { AppSettingsRepository, APP_SETTINGS_REPOSITORY } from '../../domain/repositories/app-settings.repository';

@Injectable()
export class AppSettingsService {
  constructor(
    @Inject(APP_SETTINGS_REPOSITORY)
    private readonly appSettingsRepository: AppSettingsRepository
  ) {}

  public async getAll(): Promise<AppSettings[]> {
    return this.appSettingsRepository.findAll();
  }

  public async getById(id: string): Promise<AppSettings | null> {
    return this.appSettingsRepository.findById(id);
  }
} 