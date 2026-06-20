import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { EventsModule } from '../events/events.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { UserProfileLoader } from '../core/loaders/user-profile.loader';

@Module({
  imports: [FirebaseModule, forwardRef(() => EventsModule), forwardRef(() => BusinessesModule)],
  providers: [UsersService, UserProfileLoader],
  controllers: [UsersController],
  exports: [UsersService, UserProfileLoader],
})
export class UsersModule {}
