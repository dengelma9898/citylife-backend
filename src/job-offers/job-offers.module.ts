import { Module } from '@nestjs/common';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './services/job-offers.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [FirebaseModule],
  controllers: [JobOffersController],
  providers: [JobOffersService, FirebaseStorageService],
  exports: [JobOffersService]
})
export class JobOffersModule {} 