import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { FcmNotificationService } from './infrastructure/fcm/fcm-notification.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => UsersModule)],
  providers: [
    {
      provide: NotificationService,
      useClass: FcmNotificationService,
    },
    FcmNotificationService,
  ],
  exports: [NotificationService, FcmNotificationService],
})
export class NotificationsModule {}
