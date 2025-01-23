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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    FirebaseModule,
    UsersModule,
    WalletModule,
    CitiesModule,
    AppSettingsModule,
    BusinessesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {} 