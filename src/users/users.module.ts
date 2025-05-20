import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UserAdapterService } from './services/user-adapter.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { EventsModule } from '../events/events.module';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => EventsModule),
    forwardRef(() => BusinessesModule),
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