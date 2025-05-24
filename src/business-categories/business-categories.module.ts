import { Module } from '@nestjs/common';
import { BusinessCategoriesController } from './application/controllers/business-categories.controller';
import { BusinessCategoriesService } from './application/services/business-categories.service';
import { KeywordsModule } from '../keywords/keywords.module';
import { FirebaseBusinessCategoryRepository } from './infrastructure/persistence/firebase-business-category.repository';
import { BUSINESS_CATEGORY_REPOSITORY } from './domain/repositories/business-category.repository';

@Module({
  imports: [KeywordsModule],
  controllers: [BusinessCategoriesController],
  providers: [
    BusinessCategoriesService,
    {
      provide: BUSINESS_CATEGORY_REPOSITORY,
      useClass: FirebaseBusinessCategoryRepository
    }
  ],
  exports: [BusinessCategoriesService]
})
export class BusinessCategoriesModule {} 