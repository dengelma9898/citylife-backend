import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [
    FirebaseModule,
    CitiesModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {} 