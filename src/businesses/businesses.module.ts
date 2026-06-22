import { Module, forwardRef } from '@nestjs/common';
import { BusinessesController } from './application/controllers/businesses.controller';
import { BusinessesService } from './application/services/businesses.service';
import { BusinessEventsSettingsService } from './application/services/business-events-settings.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { BusinessCategoriesModule } from '../business-categories/business-categories.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { EventsModule } from '../events/events.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PassStatsModule } from '../pass-stats/pass-stats.module';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => PassStatsModule),
    BusinessCategoriesModule,
    KeywordsModule,
    forwardRef(() => EventsModule),
    NotificationsModule,
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, BusinessEventsSettingsService],
  exports: [BusinessesService, BusinessEventsSettingsService],
})
export class BusinessesModule {}
