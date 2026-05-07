import { CuratedSpotsUserRatingsSettings } from '../entities/curated-spots-user-ratings-settings.entity';

export abstract class CuratedSpotsUserRatingsSettingsRepository {
  abstract get(): Promise<CuratedSpotsUserRatingsSettings>;
  abstract save(settings: CuratedSpotsUserRatingsSettings): Promise<CuratedSpotsUserRatingsSettings>;
}
