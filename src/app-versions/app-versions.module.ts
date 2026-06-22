import { Module } from '@nestjs/common';
import { AppVersionsController } from './application/controllers/app-versions.controller';
import { AppVersionsAdminController } from './application/controllers/app-versions-admin.controller';
import { AppVersionsService } from './application/services/app-versions.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [AppVersionsController, AppVersionsAdminController],
  providers: [AppVersionsService],
})
export class AppVersionsModule {}
