import { Injectable, Logger } from '@nestjs/common';
import {
  BaseScraper,
  ScraperConfig,
  ScraperOptions,
  ScraperResult,
} from './base-scraper.interface';
import { Event } from '../../interfaces/event.interface';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import { PuppeteerManager } from './puppeteer.config';
import { Page } from 'puppeteer';

@Injectable()
export class EventFinderScraper implements BaseScraper {
  private readonly logger = new Logger(EventFinderScraper.name);
  private config: ScraperConfig;
  private readonly defaultConfig: ScraperConfig = {
    baseUrl: 'https://www.eventfinder.de/nuernberg',
    dateFormat: 'YYYY-MM-DD',
    paginationPattern: '?page={page}',
    maxPages: 5,
  };

  constructor() {
    this.initialize();
  }

  initialize(config: Partial<ScraperConfig> = {}): void {
    this.config = { ...this.defaultConfig, ...config };
    if (!this.validateConfig()) {
      throw new Error('Invalid scraper configuration');
    }
  }

  async scrapeEvents(options: ScraperOptions): Promise<Event[]> {
    const url = this.generateUrl(options);
    return this.scrapeEventsFromUrl(url, options).then(result => result.events);
  }

  async scrapeEventsForDate(date: Date): Promise<Event[]> {
    const options: ScraperOptions = {
      startDate: date,
      endDate: date,
    };
    return this.scrapeEvents(options);
  }

  async scrapeEventsForDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const options: ScraperOptions = {
      startDate,
      endDate,
    };
    return this.scrapeEvents(options);
  }

  async scrapeEventsFromUrl(url: string, options?: ScraperOptions): Promise<ScraperResult> {
    const puppeteerManager = PuppeteerManager.getInstance();
    let page: Page | null = null;

    try {
      this.logger.debug(`Scraping events from URL: ${url}`);
      page = await puppeteerManager.getPage();

      await page.goto(url, {
        timeout: puppeteerManager.getConfig().timeout,
        waitUntil: 'networkidle0',
      });

      await this.handleCookieBanner(page);

      await page.waitForSelector('.event-list', {
        timeout: 10000,
        visible: true,
      });

      this.logger.debug('Event container found, starting to extract events...');

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.event-item');
        console.log(`Found ${eventElements.length} event elements`);
        return Array.from(eventElements).map(element => {
          const titleElement = element.querySelector('.event-title');
          const dateElement = element.querySelector('.event-date');
          const locationElement = element.querySelector('.event-location');
          const descriptionElement = element.querySelector('.event-description');

          const title = titleElement?.textContent?.trim() || '';
          const date = dateElement?.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';
          const description = descriptionElement?.textContent?.trim() || '';

          return {
            title,
            description,
            location: {
              address: location,
              latitude: 0,
              longitude: 0,
            },
            dailyTimeSlots: [
              {
                date: DateTimeUtils.convertToISO(date),
                from: '00:00',
                to: '23:59',
              },
            ],
            categoryId: 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
      });

      const maxResults = options?.maxResults || this.config.maxResults;
      const filteredEvents = events.filter(event => {
        if (!event.title) return false;
        if (options?.startDate && options?.endDate) {
          const eventDate = new Date(event.dailyTimeSlots[0].date);
          return eventDate >= options.startDate && eventDate <= options.endDate;
        }
        return true;
      });

      const limitedEvents = filteredEvents.slice(0, maxResults);

      this.logger.debug(`Found ${events.length} events, filtered to ${filteredEvents.length}, limited to ${limitedEvents.length}`);

      return {
        events: limitedEvents.map((event: Omit<Event, 'id'>) => ({
          ...event,
          id: crypto.randomUUID(),
        })),
        hasMorePages: filteredEvents.length > maxResults,
      };
    } catch (error) {
      this.logger.error(`Error scraping events from URL ${url}: ${error.message}`);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async handleCookieBanner(page: Page): Promise<void> {
    try {
      const cookieButton = await page.$('.cookie-banner button, .cookie-notice button, #cookie-notice button');
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Warte kurz, damit die Animation abgeschlossen ist
      }
    } catch (error) {
      this.logger.error(`Fehler beim Behandeln des Cookie-Banners: ${error.message}`);
    }
  }

  extractDateFromUrl(url: string): Date | null {
    const dateMatch = url.match(/datum\/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }
    return null;
  }

  generateUrlForDate(date: Date): string {
    const formattedDate = date.toISOString().split('T')[0];
    return `${this.config.baseUrl}/datum/${formattedDate}`;
  }

  generateUrl(options: ScraperOptions): string {
    const { timeFrame = 'naechste-woche', category = null } = options;
    const categoryParam = !category ? 'veranstaltungen' : category;
    return `${this.config.baseUrl}/${categoryParam}/${timeFrame}/`;
  }

  validateConfig(): boolean {
    return !!(this.config.baseUrl && this.config.dateFormat);
  }
}
