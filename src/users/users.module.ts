import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { CitiesModule } from '../cities/cities.module';
import { UserAdapterService } from './services/user-adapter.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [
    FirebaseModule,
    CitiesModule,
  ],
  providers: [
    UsersService,
    UserAdapterService,
    FirebaseStorageService
  ],
  controllers: [UsersController],
  exports: [UsersService, UserAdapterService],
})
export class UsersModule {} 