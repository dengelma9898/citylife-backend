import { Module } from '@nestjs/common';
import { FeatureRequestsController } from './application/controllers/feature-requests.controller';
import { FeatureRequestsService } from './application/services/feature-requests.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { FirebaseFeatureRequestRepository } from './infrastructure/persistence/firebase-feature-request.repository';
import { FEATURE_REQUEST_REPOSITORY } from './domain/repositories/feature-request.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [FeatureRequestsController],
  providers: [
    FeatureRequestsService,
    FirebaseStorageService,
    {
      provide: FEATURE_REQUEST_REPOSITORY,
      useClass: FirebaseFeatureRequestRepository,
    },
  ],
  exports: [FeatureRequestsService],
})
export class FeatureRequestsModule {}
