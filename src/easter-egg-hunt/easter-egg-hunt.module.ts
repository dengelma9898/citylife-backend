import { Module, forwardRef } from '@nestjs/common';
import { EasterEggHuntController } from './application/controllers/easter-egg-hunt.controller';
import { EasterEggHuntService } from './application/services/easter-egg-hunt.service';
import { EasterEggService } from './application/services/easter-egg.service';
import { EasterEggHuntEnabledGuard } from './application/guards/easter-egg-hunt-enabled.guard';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FirebaseEasterEggRepository } from './infrastructure/persistence/firebase-easter-egg.repository';
import { EASTER_EGG_REPOSITORY } from './domain/repositories/easter-egg.repository';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [FirebaseModule, UsersModule, forwardRef(() => NotificationsModule)],
  controllers: [EasterEggHuntController],
  providers: [
    EasterEggHuntService,
    EasterEggService,
    EasterEggHuntEnabledGuard,
    FirebaseStorageService,
    {
      provide: EASTER_EGG_REPOSITORY,
      useClass: FirebaseEasterEggRepository,
    },
  ],
  exports: [EasterEggHuntService],
})
export class EasterEggHuntModule {}
