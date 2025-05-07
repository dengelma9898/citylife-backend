import { Module } from '@nestjs/common';
import { EventCategoriesController } from './event-categories.controller';
import { EventCategoriesService } from './services/event-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [FirebaseModule],
  controllers: [EventCategoriesController],
  providers: [EventCategoriesService, FirebaseStorageService],
  exports: [EventCategoriesService]
})
export class EventCategoriesModule {} 