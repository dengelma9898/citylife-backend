import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { EventsModule } from '../events/events.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => EventsModule), forwardRef(() => BusinessesModule)],
  providers: [UsersService, FirebaseStorageService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
