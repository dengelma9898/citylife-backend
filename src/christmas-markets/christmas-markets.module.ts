import { Module } from '@nestjs/common';
import { ChristmasMarketsController } from './christmas-markets.controller';
import { ChristmasMarketsService } from './christmas-markets.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [ChristmasMarketsController],
  providers: [ChristmasMarketsService],
  exports: [ChristmasMarketsService],
})
export class ChristmasMarketsModule {}
