import { Injectable, Logger } from '@nestjs/common';
import { DirectChatSettingsRepository } from '../../domain/repositories/direct-chat-settings.repository';
import { DirectChatSettings } from '../../domain/entities/direct-chat-settings.entity';

@Injectable()
export class DirectChatSettingsService {
  private readonly logger = new Logger(DirectChatSettingsService.name);

  constructor(
    private readonly directChatSettingsRepository: DirectChatSettingsRepository,
  ) {}

  async getSettings(): Promise<DirectChatSettings> {
    this.logger.debug('Getting direct chat settings');
    return this.directChatSettingsRepository.get();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(isEnabled: boolean, updatedBy?: string): Promise<DirectChatSettings> {
    this.logger.debug(`Updating direct chat settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`);
    const currentSettings = await this.directChatSettingsRepository.get();
    const updatedSettings = currentSettings.update({ isEnabled }, updatedBy);
    return this.directChatSettingsRepository.save(updatedSettings);
  }
}

