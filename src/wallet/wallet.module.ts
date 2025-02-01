import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {} 