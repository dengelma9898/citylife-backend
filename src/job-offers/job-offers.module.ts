import { Module, forwardRef } from '@nestjs/common';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './application/services/job-offers.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => NotificationsModule), forwardRef(() => UsersModule)],
  controllers: [JobOffersController],
  providers: [JobOffersService],
  exports: [JobOffersService],
})
export class JobOffersModule {}
