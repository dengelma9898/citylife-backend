import { Module } from '@nestjs/common';
import { FeatureRequestsController } from './application/controllers/feature-requests.controller';
import { FeatureRequestsService } from './application/services/feature-requests.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [FeatureRequestsController],
  providers: [FeatureRequestsService],
  exports: [FeatureRequestsService],
})
export class FeatureRequestsModule {}
