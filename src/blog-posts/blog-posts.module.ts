import { Module } from '@nestjs/common';
import { BlogPostsController } from './blog-posts.controller';
import { BlogPostsService } from './blog-posts.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
@Module({
  imports: [FirebaseModule],
  controllers: [BlogPostsController],
  providers: [BlogPostsService, FirebaseStorageService],
  exports: [BlogPostsService],
})
export class BlogPostsModule {}
