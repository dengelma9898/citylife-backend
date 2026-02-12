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
import { ParksScraper } from './infrastructure/scraping/parks-scraper';
import { EventbriteScraper } from './infrastructure/scraping/eventbrite-scraper';
import { MistralExtractorService } from './infrastructure/llm/mistral-extractor.service';
import { EventNormalizerService } from './infrastructure/llm/event-normalizer.service';
import { HybridExtractorService } from './infrastructure/llm/hybrid-extractor.service';
import { CostTrackerService } from './infrastructure/llm/cost-tracker.service';
import { EventCategoriesModule } from '../event-categories/event-categories.module';
import { IsValidCategoryConstraint } from './dto/validators/is-valid-category.validator';
import { NotificationsModule } from '../notifications/notifications.module';
import { LocationModule } from '../location/location.module';
import { CsvImportService } from './application/services/csv-import.service';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
    forwardRef(() => BusinessesModule),
    EventCategoriesModule,
    forwardRef(() => NotificationsModule),
    LocationModule,
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
    ParksScraper,
    EventbriteScraper,
    MistralExtractorService,
    EventNormalizerService,
    HybridExtractorService,
    CostTrackerService,
    IsValidCategoryConstraint,
    CsvImportService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
