import { Module } from '@nestjs/common';
import { AdventCalendarController } from './application/controllers/advent-calendar.controller';
import { AdventCalendarService } from './application/services/advent-calendar.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [AdventCalendarController],
  providers: [AdventCalendarService],
  exports: [AdventCalendarService],
})
export class AdventCalendarModule {}
