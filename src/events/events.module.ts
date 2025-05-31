import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersModule } from '../users/users.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ScraperService } from './infrastructure/scraping/scraper.service';
import { EventFinderScraper } from './infrastructure/scraping/eventfinder-scraper';
import { CurtScraper } from './infrastructure/scraping/curt-scraper';
import { ScraperFactory } from './infrastructure/scraping/scraper-factory';
import { RausgegangenScraper } from './infrastructure/scraping/rausgegangen-scraper';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => BusinessesModule),
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    FirebaseStorageService,
    ScraperService,
    EventFinderScraper,
    CurtScraper,
    ScraperFactory,
    RausgegangenScraper,
  ],
  exports: [EventsService],
})
export class EventsModule {}
