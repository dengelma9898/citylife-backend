import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { FirebaseModule } from './firebase/firebase.module';
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
import { JobOfferCategoriesModule } from './job-offer-categories/job-offer-categories.module';
import { JobOffersModule } from './job-offers/job-offers.module';
import { SpecialPollsModule } from './special-polls/special-polls.module';
import { AccountManagementModule } from './account-management/account-management.module';
import { DowntimeModule } from './downtime/downtime.module';
import { AdventCalendarModule } from './advent-calendar/advent-calendar.module';
import { LegalDocumentsModule } from './legal-documents/legal-documents.module';
import { DirectChatsModule } from './direct-chats/direct-chats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [process.env.NODE_ENV === 'prd' ? '.env.prd' : '.env.dev'],
    }),
    CoreModule,
    FirebaseModule,
    UsersModule,
    WalletModule,
    AppSettingsModule,
    BusinessesModule,
    NewsModule,
    EventsModule,
    ChatroomsModule,
    KeywordsModule,
    BusinessCategoriesModule,
    LocationModule,
    EventCategoriesModule,
    ContactModule,
    JobOfferCategoriesModule,
    JobOffersModule,
    SpecialPollsModule,
    AccountManagementModule,
    DowntimeModule,
    AdventCalendarModule,
    LegalDocumentsModule,
    DirectChatsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
