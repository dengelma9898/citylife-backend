import { Module } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
})
export class AppSettingsModule {}
