import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [FirebaseModule],
  controllers: [EventsController],
  providers: [EventsService, FirebaseStorageService],
  exports: [EventsService]
})
export class EventsModule {} 