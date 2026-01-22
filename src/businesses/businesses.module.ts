import { Module, forwardRef } from '@nestjs/common';
import { BusinessesController } from './application/controllers/businesses.controller';
import { BusinessesService } from './application/services/businesses.service';
import { BusinessEventsSettingsService } from './application/services/business-events-settings.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { BusinessCategoriesModule } from '../business-categories/business-categories.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { EventsModule } from '../events/events.module';
import { FirebaseBusinessRepository } from './infrastructure/persistence/firebase-business.repository';
import { BUSINESS_REPOSITORY } from './domain/repositories/business.repository';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessEventsSettingsRepository } from './domain/repositories/business-events-settings.repository';
import { FirebaseBusinessEventsSettingsRepository } from './infrastructure/persistence/firebase-business-events-settings.repository';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
    BusinessCategoriesModule,
    KeywordsModule,
    forwardRef(() => EventsModule),
    NotificationsModule,
  ],
  controllers: [BusinessesController],
  providers: [
    BusinessesService,
    BusinessEventsSettingsService,
    FirebaseStorageService,
    {
      provide: BUSINESS_REPOSITORY,
      useClass: FirebaseBusinessRepository,
    },
    {
      provide: BusinessEventsSettingsRepository,
      useClass: FirebaseBusinessEventsSettingsRepository,
    },
  ],
  exports: [BusinessesService, BusinessEventsSettingsService],
})
export class BusinessesModule {}
