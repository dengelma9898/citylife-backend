import { Module } from '@nestjs/common';
import { TaxiStandsController } from './application/controllers/taxi-stands.controller';
import { TaxiStandsFeatureService } from './application/services/taxi-stands-feature.service';
import { TaxiStandService } from './application/services/taxi-stand.service';
import { TaxiStandsEnabledGuard } from './application/guards/taxi-stands-enabled.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebaseTaxiStandRepository } from './infrastructure/persistence/firebase-taxi-stand.repository';
import { TAXI_STAND_REPOSITORY } from './domain/repositories/taxi-stand.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [TaxiStandsController],
  providers: [
    TaxiStandsFeatureService,
    TaxiStandService,
    TaxiStandsEnabledGuard,
    {
      provide: TAXI_STAND_REPOSITORY,
      useClass: FirebaseTaxiStandRepository,
    },
  ],
  exports: [TaxiStandsFeatureService],
})
export class TaxiStandsModule {}
