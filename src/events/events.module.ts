import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersModule } from '../users/users.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { EventCategoriesModule } from '../event-categories/event-categories.module';
import { IsValidCategoryConstraint } from './dto/validators/is-valid-category.validator';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationModule } from '../location/location.module';
import { CsvImportService } from './application/services/csv-import.service';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => BusinessesModule),
    EventCategoriesModule,
    forwardRef(() => NotificationsModule),
    LocationModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    FirebaseStorageService,
    IsValidCategoryConstraint,
    CsvImportService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
