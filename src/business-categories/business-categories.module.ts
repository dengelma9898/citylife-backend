import { Module } from '@nestjs/common';
import { BusinessCategoriesController } from './business-categories.controller';
import { BusinessCategoriesService } from './business-categories.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { KeywordsModule } from '../keywords/keywords.module';

@Module({
  imports: [FirebaseModule, KeywordsModule],
  controllers: [BusinessCategoriesController],
  providers: [BusinessCategoriesService],
  exports: [BusinessCategoriesService]
})
export class BusinessCategoriesModule {} 