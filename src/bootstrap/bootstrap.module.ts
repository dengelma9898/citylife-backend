import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { EventCategoriesModule } from '../event-categories/event-categories.module';
import { BusinessCategoriesModule } from '../business-categories/business-categories.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { DowntimeModule } from '../downtime/downtime.module';
import { AppVersionsModule } from '../app-versions/app-versions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AppSettingsModule,
    EventCategoriesModule,
    BusinessCategoriesModule,
    KeywordsModule,
    DowntimeModule,
    AppVersionsModule,
    UsersModule,
  ],
  controllers: [BootstrapController],
  providers: [BootstrapService],
})
export class BootstrapModule {}
