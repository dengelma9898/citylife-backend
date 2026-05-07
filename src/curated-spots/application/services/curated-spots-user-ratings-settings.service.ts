import { Injectable, Logger } from '@nestjs/common';
import { CuratedSpotsUserRatingsSettingsRepository } from '../../domain/repositories/curated-spots-user-ratings-settings.repository';
import { CuratedSpotsUserRatingsSettings } from '../../domain/entities/curated-spots-user-ratings-settings.entity';

@Injectable()
export class CuratedSpotsUserRatingsSettingsService {
  private readonly logger = new Logger(CuratedSpotsUserRatingsSettingsService.name);

  constructor(
    private readonly curatedSpotsUserRatingsSettingsRepository: CuratedSpotsUserRatingsSettingsRepository,
  ) {}

  async getSettings(): Promise<CuratedSpotsUserRatingsSettings> {
    this.logger.debug('Getting curated spots user ratings settings');
    return this.curatedSpotsUserRatingsSettingsRepository.get();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  async updateSettings(
    isEnabled: boolean,
    updatedBy?: string,
  ): Promise<CuratedSpotsUserRatingsSettings> {
    this.logger.debug(
      `Updating curated spots user ratings settings: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const current = await this.curatedSpotsUserRatingsSettingsRepository.get();
    const updated = current.update({ isEnabled }, updatedBy);
    return this.curatedSpotsUserRatingsSettingsRepository.save(updated);
  }
}
