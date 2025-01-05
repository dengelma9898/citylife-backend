import { Module } from '@nestjs/common';
import { CitiesController } from './cities.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { CitiesService } from './cities.service';

@Module({
  imports: [FirebaseModule],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {} 