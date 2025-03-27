import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersModule } from '../users/users.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    FirebaseModule, 
    forwardRef(() => UsersModule),
    forwardRef(() => BusinessesModule)
  ],
  controllers: [EventsController],
  providers: [EventsService, FirebaseStorageService],
  exports: [EventsService]
})
export class EventsModule {} 