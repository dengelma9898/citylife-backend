import { Module } from '@nestjs/common';
import { SpecialPollsService } from './special-polls.service';
import { SpecialPollsController } from './special-polls.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [SpecialPollsController],
  providers: [SpecialPollsService],
  exports: [SpecialPollsService],
})
export class SpecialPollsModule {}
