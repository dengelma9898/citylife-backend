import { Injectable } from '@nestjs/common';
import { BaseScraper, ScraperType } from './base-scraper.interface';
import { EventFinderScraper } from './eventfinder-scraper';
import { CurtScraper } from './curt-scraper';
import { RausgegangenScraper } from './rausgegangen-scraper';
import { EventbriteScraper } from './eventbrite-scraper';

@Injectable()
export class ScraperFactory {
  constructor(
    private readonly eventFinderScraper: EventFinderScraper,
    private readonly curtScraper: CurtScraper,
    private readonly rausgegangenScraper: RausgegangenScraper,
    private readonly eventbriteScraper: EventbriteScraper,
  ) {}

  createScraper(type: ScraperType): BaseScraper {
    switch (type) {
      case ScraperType.EVENTFINDER:
        return this.eventFinderScraper;
      case ScraperType.CURT:
        return this.curtScraper;
      case ScraperType.RAUSGEGANGEN:
        return this.rausgegangenScraper;
      case ScraperType.EVENTBRITE:
        return this.eventbriteScraper;
      default:
        throw new Error(`Unsupported scraper type: ${type}`);
    }
  }
}
