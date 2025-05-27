import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [NewsController],
  providers: [NewsService, FirebaseStorageService],
  exports: [NewsService],
})
export class NewsModule {}
