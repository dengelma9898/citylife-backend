import { Injectable, Logger } from '@nestjs/common';
import { BusinessEventsSettingsRepository } from '../../domain/repositories/business-events-settings.repository';
import { BusinessEventsSettings } from '../../domain/entities/business-events-settings.entity';

@Injectable()
export class BusinessEventsSettingsService {
  private readonly logger = new Logger(BusinessEventsSettingsService.name);

  constructor(
    private readonly businessEventsSettingsRepository: BusinessEventsSettingsRepository,
  ) {}

  async getSettings(): Promise<BusinessEventsSettings> {
    this.logger.debug('Getting business events settings');
    return this.businessEventsSettingsRepository.get();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(isEnabled: boolean, updatedBy?: string): Promise<BusinessEventsSettings> {
    this.logger.debug(
      `Updating business events settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const currentSettings = await this.businessEventsSettingsRepository.get();
    const updatedSettings = currentSettings.update({ isEnabled }, updatedBy);
    return this.businessEventsSettingsRepository.save(updatedSettings);
  }
}
