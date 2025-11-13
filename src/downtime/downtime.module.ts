import { Module } from '@nestjs/common';
import { DowntimeController } from './downtime.controller';
import { DowntimeService } from './downtime.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [DowntimeController],
  providers: [DowntimeService],
})
export class DowntimeModule {}

