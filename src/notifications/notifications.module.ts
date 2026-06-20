import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './application/services/notification.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => UsersModule)],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
