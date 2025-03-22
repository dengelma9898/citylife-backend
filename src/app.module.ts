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
import { BlogPostsModule } from './blog-posts/blog-posts.module';
import { EventsModule } from './events/events.module';
import { ChatroomsModule } from './chatrooms/chatrooms.module';
import { KeywordsModule } from './keywords/keywords.module';
import { BusinessCategoriesModule } from './business-categories/business-categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.docker'],
    }),
    CoreModule,
    FirebaseModule,
    UsersModule,
    WalletModule,
    CitiesModule,
    AppSettingsModule,
    BusinessesModule,
    BlogPostsModule,
    EventsModule,
    ChatroomsModule,
    KeywordsModule,
    BusinessCategoriesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {} 