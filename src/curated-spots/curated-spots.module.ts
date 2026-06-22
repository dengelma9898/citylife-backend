import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { CuratedSpotsController } from './application/controllers/curated-spots.controller';
import { SpotKeywordsController } from './application/controllers/spot-keywords.controller';
import { CuratedSpotsService } from './application/services/curated-spots.service';
import { SpotKeywordsService } from './application/services/spot-keywords.service';
import { CuratedSpotsUserRatingsSettingsService } from './application/services/curated-spots-user-ratings-settings.service';
import { CuratedSpotUserRatingsService } from './application/services/curated-spot-user-ratings.service';
import { CuratedSpotsUserRatingsEnabledGuard } from './application/guards/curated-spots-user-ratings-enabled.guard';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [CuratedSpotsController, SpotKeywordsController],
  providers: [
    CuratedSpotsService,
    SpotKeywordsService,
    CuratedSpotsUserRatingsSettingsService,
    CuratedSpotUserRatingsService,
    CuratedSpotsUserRatingsEnabledGuard,
  ],
  exports: [CuratedSpotsService, SpotKeywordsService],
})
export class CuratedSpotsModule {}
