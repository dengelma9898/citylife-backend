import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {} 