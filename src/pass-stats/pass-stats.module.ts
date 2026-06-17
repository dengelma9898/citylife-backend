import { Module, forwardRef } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebasePassScanRepository } from './infrastructure/persistence/firebase-pass-scan.repository';
import { PassScanService } from './application/services/pass-scan.service';
import { PassStatsService } from './application/services/pass-stats.service';
import { PassStatsController } from './application/controllers/pass-stats.controller';
import { PassStatsTestSeedService } from './application/services/pass-stats-test-seed.service';

@Module({
  imports: [FirebaseModule, forwardRef(() => UsersModule)],
  controllers: [PassStatsController],
  providers: [
    FirebasePassScanRepository,
    PassScanService,
    PassStatsService,
    PassStatsTestSeedService,
  ],
  exports: [PassScanService, PassStatsService],
})
export class PassStatsModule {}
