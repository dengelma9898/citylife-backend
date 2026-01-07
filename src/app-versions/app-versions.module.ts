import { Module } from '@nestjs/common';
import { AppVersionsController } from './application/controllers/app-versions.controller';
import { AppVersionsAdminController } from './application/controllers/app-versions-admin.controller';
import { AppVersionsService } from './application/services/app-versions.service';
import { FirebaseAppVersionRepository } from './infrastructure/persistence/firebase-app-version.repository';
import { APP_VERSION_REPOSITORY } from './domain/repositories/app-version.repository';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [AppVersionsController, AppVersionsAdminController],
  providers: [
    AppVersionsService,
    {
      provide: APP_VERSION_REPOSITORY,
      useClass: FirebaseAppVersionRepository,
    },
  ],
})
export class AppVersionsModule {}
