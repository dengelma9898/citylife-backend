import { Module, forwardRef } from '@nestjs/common';
import { SpecialPollsService } from './special-polls.service';
import { SpecialPollsController } from './special-polls.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FirebaseModule, UsersModule, forwardRef(() => NotificationsModule)],
  controllers: [SpecialPollsController],
  providers: [SpecialPollsService],
  exports: [SpecialPollsService],
})
export class SpecialPollsModule {}
