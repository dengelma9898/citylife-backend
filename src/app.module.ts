import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './core/core.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { BusinessesModule } from './businesses/businesses.module';
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
import { FeatureRequestsModule } from './feature-requests/feature-requests.module';
import { AppVersionsModule } from './app-versions/app-versions.module';
import { HealthModule } from './health/health.module';
import { EasterEggHuntModule } from './easter-egg-hunt/easter-egg-hunt.module';
import { TaxiStandsModule } from './taxi-stands/taxi-stands.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [process.env.NODE_ENV === 'prd' ? '.env.prd' : '.env.dev'],
    }),
    // Rate-Limiting: Schutz vor DDoS und Brute-Force-Angriffen
    // ttl: Zeitfenster in Millisekunden (60000ms = 60 Sekunden)
    // limit: Maximale Anzahl Anfragen pro Zeitfenster
    // Siehe docs/configuration-values.md für Erläuterungen der Werte
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: process.env.NODE_ENV === 'dev' ? 100 : 60,
      },
    ]),
    // Caching: In-Memory-Cache für teure Operationen
    // ttl: Time-to-Live in Millisekunden (300000ms = 5 Minuten)
    // max: Maximale Anzahl gecachter Items (LRU Eviction bei Überschreitung)
    // Siehe docs/configuration-values.md für Erläuterungen der Werte
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 Minuten
      max: process.env.NODE_ENV === 'dev' ? 50 : 100,
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
    FeatureRequestsModule,
    AppVersionsModule,
    HealthModule,
    EasterEggHuntModule,
    TaxiStandsModule,
  ],
})
export class AppModule {}
