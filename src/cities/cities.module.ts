import { Module } from '@nestjs/common';
import { CitiesController } from './cities.controller';
import { CurrentCityController } from './current-city.controller';
import { CitiesService } from './cities.service';
import { CurrentCityService } from './current-city.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [CitiesController, CurrentCityController],
  providers: [CitiesService, CurrentCityService],
})
export class CitiesModule {} 