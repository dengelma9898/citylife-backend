import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { AccountManagementService } from './services/account-management.service';
import { AccountManagementController } from './account-management.controller';


@Module({
  imports: [FirebaseModule],
  controllers: [AccountManagementController],
  providers: [AccountManagementService],
  exports: [AccountManagementService]
})
export class AccountManagementModule {} 