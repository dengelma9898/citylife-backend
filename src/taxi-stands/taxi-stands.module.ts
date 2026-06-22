import { Module } from '@nestjs/common';
import { TaxiStandsController } from './application/controllers/taxi-stands.controller';
import { TaxiStandsFeatureService } from './application/services/taxi-stands-feature.service';
import { TaxiStandService } from './application/services/taxi-stand.service';
import { TaxiStandsEnabledGuard } from './application/guards/taxi-stands-enabled.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [TaxiStandsController],
  providers: [TaxiStandsFeatureService, TaxiStandService, TaxiStandsEnabledGuard],
  exports: [TaxiStandsFeatureService],
})
export class TaxiStandsModule {}
