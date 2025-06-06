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
export class RausgegangenScraper implements BaseScraper {
  private readonly logger = new Logger(RausgegangenScraper.name);
  private config: ScraperConfig;
  private readonly defaultConfig: ScraperConfig = {
    baseUrl: 'https://rausgegangen.de/nurnberg/eventsbydate',
    dateFormat: 'DD.MM.YYYY',
    // Feste Parameter für Nürnberg
    fixedParams: {
      geospatial_query_type: 'CITY',
      lat: '49.453872',
      lng: '11.077298',
      city: 'nurnberg',
      active_city_name: 'Nürnberg',
    },
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
    // Aktualisiere maxResults in der Konfiguration
    this.config = { ...this.config, maxResults: options.maxResults };

    if (options.startDate && options.endDate) {
      return this.scrapeEventsForDateRange(options.startDate, options.endDate);
    }
    if (options.startDate) {
      return this.scrapeEventsForDate(options.startDate);
    }
    const url = this.generateUrl(options);
    return this.scrapeEventsFromUrl(url).then(result => result.events);
  }

  async scrapeEventsForDate(date: Date): Promise<Event[]> {
    const url = this.generateUrlForDate(date);
    const result = await this.scrapeEventsFromUrl(url);
    return result.events;
  }

  async scrapeEventsForDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    const events: Event[] = [];
    let currentDate = new Date(startDate);
    const maxResultsPerDay = this.config.maxResults || 10;

    this.logger.debug(
      `Scraping events for date range: ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );
    this.logger.debug(`Max results per day: ${maxResultsPerDay}`);

    while (currentDate <= endDate) {
      const dateEvents = await this.scrapeEventsForDate(currentDate);
      events.push(...dateEvents);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.logger.debug(`Total events found: ${events.length}`);
    return events;
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

  generateUrlForDate(date: Date): string {
    const formattedDate = date.toISOString().split('T')[0];
    const params = new URLSearchParams({
      ...this.config.fixedParams,
      start_date: formattedDate,
      end_date: formattedDate,
    });
    return `${this.config.baseUrl}/?${params.toString()}`;
  }

  generateUrl(options: ScraperOptions): string {
    if (options.startDate && options.endDate) {
      const params = new URLSearchParams({
        ...this.config.fixedParams,
        start_date: options.startDate.toISOString().split('T')[0],
        end_date: options.endDate.toISOString().split('T')[0],
      });
      return `${this.config.baseUrl}/?${params.toString()}`;
    }
    if (options.startDate) {
      return this.generateUrlForDate(options.startDate);
    }
    return this.config.baseUrl;
  }

  validateConfig(): boolean {
    return !!(this.config.baseUrl && this.config.dateFormat && this.config.fixedParams);
  }

  extractDateFromUrl(url: string): Date | null {
    const params = new URLSearchParams(url.split('?')[1]);
    const startDate = params.get('start_date');
    if (startDate) {
      return new Date(startDate);
    }
    return null;
  }

  async handleCookieBanner(page: Page): Promise<void> {
    try {
      const cookieButton = await page.$('.cookie-banner button, .cookie-notice button, #cookie-notice button');
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[RausgegangenScraper] Fehler beim Behandeln des Cookie-Banners:', error);
    }
  }
}
