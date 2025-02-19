import { Module } from '@nestjs/common';
import { BusinessUsersController } from './business-users.controller';
import { BusinessUsersService } from './business-users.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [BusinessUsersController],
  providers: [BusinessUsersService],
  exports: [BusinessUsersService]
})
export class BusinessUsersModule {} 