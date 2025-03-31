import { Module } from '@nestjs/common';
import { EventCategoriesController } from './event-categories.controller';
import { EventCategoriesService } from './services/event-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [EventCategoriesController],
  providers: [EventCategoriesService],
  exports: [EventCategoriesService]
})
export class EventCategoriesModule {} 