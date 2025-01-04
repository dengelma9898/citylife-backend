import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from './core/core.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { FirebaseModule } from './firebase/firebase.module';
import { CitiesModule } from './cities/cities.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { BusinessCategoriesModule } from './business-categories/business-categories.module';
import { BusinessUsersModule } from './business-users/business-users.module';
import { BusinessesModule } from './businesses/businesses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    FirebaseModule,
    UsersModule,
    WalletModule,
    CitiesModule,
    AppSettingsModule,
    BusinessCategoriesModule,
    BusinessUsersModule,
    BusinessesModule,
  ],
})
export class AppModule {} 