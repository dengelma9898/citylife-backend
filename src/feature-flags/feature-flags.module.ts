import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FeatureFlagsController } from './application/controllers/feature-flags.controller';
import { FeatureFlagsService } from './application/services/feature-flags.service';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
