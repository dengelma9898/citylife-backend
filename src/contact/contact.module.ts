import { Module, forwardRef } from '@nestjs/common';
import { ContactController } from './application/controllers/contact.controller';
import { ContactService } from './application/services/contact.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => UsersModule), FirebaseModule, NotificationsModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
