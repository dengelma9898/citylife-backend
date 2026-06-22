import { Module } from '@nestjs/common';
import { BusinessCategoriesController } from './application/controllers/business-categories.controller';
import { BusinessCategoriesService } from './application/services/business-categories.service';
import { KeywordsModule } from '../keywords/keywords.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [KeywordsModule, FirebaseModule],
  controllers: [BusinessCategoriesController],
  providers: [BusinessCategoriesService],
  exports: [BusinessCategoriesService],
})
export class BusinessCategoriesModule {}
