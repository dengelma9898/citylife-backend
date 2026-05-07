import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CuratedSpotsUserRatingsSettingsService } from '../services/curated-spots-user-ratings-settings.service';

@Injectable()
export class CuratedSpotsUserRatingsEnabledGuard implements CanActivate {
  constructor(
    private readonly curatedSpotsUserRatingsSettingsService: CuratedSpotsUserRatingsSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = await this.curatedSpotsUserRatingsSettingsService.isFeatureEnabled();
    if (!isEnabled) {
      throw new ServiceUnavailableException(
        'Curated spots user ratings feature is currently disabled',
      );
    }
    return true;
  }
}
