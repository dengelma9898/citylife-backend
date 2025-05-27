import { Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { FirebaseStorageService } from './firebase-storage.service';

@Module({
  providers: [FirebaseService, FirebaseStorageService],
  exports: [FirebaseService, FirebaseStorageService],
})
export class FirebaseModule {}
