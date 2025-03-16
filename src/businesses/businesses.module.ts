import { Module } from '@nestjs/common';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [
    FirebaseModule,
    UsersModule
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, FirebaseStorageService],
  exports: [BusinessesService]
})
export class BusinessesModule {} 