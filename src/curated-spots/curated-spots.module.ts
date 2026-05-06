import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { CuratedSpotsController } from './application/controllers/curated-spots.controller';
import { SpotKeywordsController } from './application/controllers/spot-keywords.controller';
import { CuratedSpotsService } from './application/services/curated-spots.service';
import { SpotKeywordsService } from './application/services/spot-keywords.service';
import { FirebaseCuratedSpotRepository } from './infrastructure/persistence/firebase-curated-spot.repository';
import { FirebaseSpotKeywordRepository } from './infrastructure/persistence/firebase-spot-keyword.repository';
import { CURATED_SPOT_REPOSITORY } from './domain/repositories/curated-spot.repository';
import { SPOT_KEYWORD_REPOSITORY } from './domain/repositories/spot-keyword.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [CuratedSpotsController, SpotKeywordsController],
  providers: [
    CuratedSpotsService,
    SpotKeywordsService,
    {
      provide: CURATED_SPOT_REPOSITORY,
      useClass: FirebaseCuratedSpotRepository,
    },
    {
      provide: SPOT_KEYWORD_REPOSITORY,
      useClass: FirebaseSpotKeywordRepository,
    },
  ],
  exports: [CuratedSpotsService, SpotKeywordsService],
})
export class CuratedSpotsModule {}
