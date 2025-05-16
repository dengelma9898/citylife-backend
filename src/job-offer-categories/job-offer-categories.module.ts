import { Module } from '@nestjs/common';
import { JobOfferCategoriesService } from './services/job-offer-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { JobOfferCategoriesController } from './job-offer-categories.controller';

@Module({
  imports: [FirebaseModule],
  controllers: [JobOfferCategoriesController],
  providers: [JobOfferCategoriesService, FirebaseStorageService],
  exports: [JobOfferCategoriesService]
})
export class JobOfferCategoriesModule {} 