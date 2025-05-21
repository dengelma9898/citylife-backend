import { Module } from '@nestjs/common';
import { JobOfferCategoriesService } from './services/job-offer-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { JobOfferCategoriesController } from './job-offer-categories.controller';
import { FirebaseJobCategoryRepository } from './infrastructure/persistence/firebase-job-category.repository';
import { JOB_CATEGORY_REPOSITORY } from './domain/repositories/job-category.repository';

@Module({
  imports: [FirebaseModule],
  controllers: [JobOfferCategoriesController],
  providers: [
    JobOfferCategoriesService,
    {
      provide: JOB_CATEGORY_REPOSITORY,
      useClass: FirebaseJobCategoryRepository
    }
  ],
  exports: [JobOfferCategoriesService]
})
export class JobOfferCategoriesModule {} 