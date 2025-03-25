import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => UsersModule)],
  controllers: [EventsController],
  providers: [EventsService, FirebaseStorageService],
  exports: [EventsService]
})
export class EventsModule {} 