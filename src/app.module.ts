import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { FirebaseModule } from './firebase/firebase.module';
import { CitiesModule } from './cities/cities.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { BusinessesModule } from './businesses/businesses.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './core/guards/auth.guard';
import { NewsModule } from './news/news.module';
import { EventsModule } from './events/events.module';
import { ChatroomsModule } from './chatrooms/chatrooms.module';
import { KeywordsModule } from './keywords/keywords.module';
import { BusinessCategoriesModule } from './business-categories/business-categories.module';
import { LocationModule } from './location/location.module';
import { EventCategoriesModule } from './event-categories/event-categories.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        process.env.NODE_ENV === 'production' ? '.env.prd' : '.env.dev',
      ],
    }),
    CoreModule,
    FirebaseModule,
    UsersModule,
    WalletModule,
    CitiesModule,
    AppSettingsModule,
    BusinessesModule,
    NewsModule,
    EventsModule,
    ChatroomsModule,
    KeywordsModule,
    BusinessCategoriesModule,
    LocationModule,
    EventCategoriesModule,
    ContactModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {} 