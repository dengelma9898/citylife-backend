import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { CuratedSpotsController } from './application/controllers/curated-spots.controller';
import { SpotKeywordsController } from './application/controllers/spot-keywords.controller';
import { CuratedSpotsService } from './application/services/curated-spots.service';
import { SpotKeywordsService } from './application/services/spot-keywords.service';
import { CuratedSpotsUserRatingsSettingsService } from './application/services/curated-spots-user-ratings-settings.service';
import { CuratedSpotUserRatingsService } from './application/services/curated-spot-user-ratings.service';
import { FirebaseCuratedSpotRepository } from './infrastructure/persistence/firebase-curated-spot.repository';
import { FirebaseSpotKeywordRepository } from './infrastructure/persistence/firebase-spot-keyword.repository';
import { FirebaseCuratedSpotsUserRatingsSettingsRepository } from './infrastructure/persistence/firebase-curated-spots-user-ratings-settings.repository';
import { CuratedSpotsUserRatingsEnabledGuard } from './application/guards/curated-spots-user-ratings-enabled.guard';
import { CURATED_SPOT_REPOSITORY } from './domain/repositories/curated-spot.repository';
import { SPOT_KEYWORD_REPOSITORY } from './domain/repositories/spot-keyword.repository';
import { CuratedSpotsUserRatingsSettingsRepository } from './domain/repositories/curated-spots-user-ratings-settings.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [CuratedSpotsController, SpotKeywordsController],
  providers: [
    CuratedSpotsService,
    SpotKeywordsService,
    CuratedSpotsUserRatingsSettingsService,
    CuratedSpotUserRatingsService,
    CuratedSpotsUserRatingsEnabledGuard,
    {
      provide: CURATED_SPOT_REPOSITORY,
      useClass: FirebaseCuratedSpotRepository,
    },
    {
      provide: SPOT_KEYWORD_REPOSITORY,
      useClass: FirebaseSpotKeywordRepository,
    },
    {
      provide: CuratedSpotsUserRatingsSettingsRepository,
      useClass: FirebaseCuratedSpotsUserRatingsSettingsRepository,
    },
  ],
  exports: [CuratedSpotsService, SpotKeywordsService],
})
export class CuratedSpotsModule {}
