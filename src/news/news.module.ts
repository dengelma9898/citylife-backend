import { Module, forwardRef } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FirebaseModule, UsersModule, forwardRef(() => NotificationsModule)],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
