import { Module } from '@nestjs/common';
import { JobOfferCategoriesService } from './services/job-offer-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { JobOfferCategoriesController } from './job-offer-categories.controller';

@Module({
  imports: [FirebaseModule],
  controllers: [JobOfferCategoriesController],
  providers: [JobOfferCategoriesService],
  exports: [JobOfferCategoriesService],
})
export class JobOfferCategoriesModule {}
