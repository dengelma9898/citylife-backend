import { Module } from '@nestjs/common';
import { EasterEggHuntController } from './application/controllers/easter-egg-hunt.controller';
import { EasterEggHuntService } from './application/services/easter-egg-hunt.service';
import { EasterEggService } from './application/services/easter-egg.service';
import { EasterEggHuntEnabledGuard } from './application/guards/easter-egg-hunt-enabled.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [FirebaseModule, UsersModule, forwardRef(() => NotificationsModule)],
  controllers: [EasterEggHuntController],
  providers: [EasterEggHuntService, EasterEggService, EasterEggHuntEnabledGuard],
  exports: [EasterEggHuntService],
})
export class EasterEggHuntModule {}
