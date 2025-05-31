import { Injectable, Logger } from '@nestjs/common';
import { BaseScraper, ScraperType } from './base-scraper.interface';
import { EventFinderScraper } from './eventfinder-scraper';
import { CurtScraper } from './curt-scraper';
import { RausgegangenScraper } from './rausgegangen-scraper';
import { Event } from '../../interfaces/event.interface';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private scrapers: Map<ScraperType, BaseScraper> = new Map();

  constructor(
    private readonly eventFinderScraper: EventFinderScraper,
    private readonly curtScraper: CurtScraper,
    private readonly rausgegangenScraper: RausgegangenScraper,
  ) {
    this.initializeScrapers();
  }

  private initializeScrapers(): void {
    this.scrapers.set(ScraperType.EVENTFINDER, this.eventFinderScraper);
    this.scrapers.set(ScraperType.CURT, this.curtScraper);
    this.scrapers.set(ScraperType.RAUSGEGANGEN, this.rausgegangenScraper);
  }

  /**
   * Aktiviert einen Scraper für einen bestimmten Typ
   */
  activateScraper(type: ScraperType): void {
    if (!this.scrapers.has(type)) {
      const scraper = this.getScraper(type);
      this.scrapers.set(type, scraper);
      this.logger.debug(`Activated scraper for type: ${type}`);
    }
  }

  /**
   * Deaktiviert einen Scraper
   */
  deactivateScraper(type: ScraperType): void {
    this.scrapers.delete(type);
    this.logger.debug(`Deactivated scraper for type: ${type}`);
  }

  /**
   * Holt Events von allen aktiven Scrapern für ein bestimmtes Datum
   */
  async scrapeEventsForDate(date: Date): Promise<Event[]> {
    const events: Event[] = [];
    const promises: Promise<Event[]>[] = [];

    for (const scraper of this.scrapers.values()) {
      promises.push(scraper.scrapeEventsForDate(date));
    }

    const results = await Promise.all(promises);
    results.forEach(result => events.push(...result));

    return events;
  }

  /**
   * Holt Events von allen aktiven Scrapern für einen Datumsbereich
   */
  async scrapeEventsForDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const events: Event[] = [];
    const promises: Promise<Event[]>[] = [];

    for (const scraper of this.scrapers.values()) {
      promises.push(scraper.scrapeEventsForDateRange(startDate, endDate));
    }

    const results = await Promise.all(promises);
    results.forEach(result => events.push(...result));

    return events;
  }

  /**
   * Holt Events von einem bestimmten Scraper für eine URL
   */
  async scrapeEventsFromUrl(type: ScraperType, url: string): Promise<Event[]> {
    const scraper = this.scrapers.get(type);
    if (!scraper) {
      throw new Error(`No active scraper found for type: ${type}`);
    }

    const result = await scraper.scrapeEventsFromUrl(url);
    return result.events;
  }

  /**
   * Gibt alle aktiven Scraper-Typen zurück
   */
  getActiveScrapers(): ScraperType[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Gibt einen aktiven Scraper zurück
   */
  getScraper(type: ScraperType): BaseScraper {
    const scraper = this.scrapers.get(type);
    if (!scraper) {
      throw new Error(`Scraper type ${type} not found`);
    }
    return scraper;
  }
}
