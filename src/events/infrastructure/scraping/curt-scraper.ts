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
export class CurtScraper implements BaseScraper {
  private readonly logger = new Logger(CurtScraper.name);
  private config: ScraperConfig;
  private readonly defaultConfig: ScraperConfig = {
    baseUrl: 'https://www.curt.de/termine/84',
    dateFormat: 'YYYY-MM-DD',
    paginationPattern: 'tag/{date}/',
    maxPages: 7,
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
    if (options.startDate && options.endDate) {
      this.config.maxResults = options.maxResults;
      return this.scrapeEventsForDateRange(options.startDate, options.endDate);
    }
    if (options.startDate) {
      this.config.maxResults = options.maxResults;
      return this.scrapeEventsForDate(options.startDate);
    }
    const url = this.generateUrl(options);
    this.config.maxResults = options.maxResults;
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

  async scrapeEventsFromUrl(url: string): Promise<ScraperResult> {
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

      await page.waitForSelector('#eventinnen', {
        timeout: 10000,
        visible: true,
      });

      this.logger.debug('Event container found, starting to extract events...');

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll(
          '.event, .event-item, .event-container, .termin',
        );
        console.log(`Found ${eventElements.length} event elements`);

        return Array.from(eventElements)
          .map(element => {
            const timeElement =
              element.querySelector('.links .time, .time, .uhrzeit')?.textContent?.trim() || '';
            const dateElement =
              element.querySelector('.links .dat, .date, .datum')?.textContent?.trim() || '';
            const categoryElement =
              element.querySelector('.mitte .cat, .category, .kategorie')?.textContent?.trim() ||
              '';
            const locationElement =
              element.querySelector('.mitte .loc, .location, .ort')?.textContent?.trim() || '';
            const titleElement =
              element.querySelector('.title a, .event-title, .titel')?.textContent?.trim() || '';
            const descriptionElement =
              element
                .querySelector('.description a, .event-description, .beschreibung')
                ?.textContent?.trim() || '';

            const startDate =
              dateElement && timeElement ? `${dateElement} ${timeElement}` : dateElement;

            return {
              title: titleElement,
              description: descriptionElement,
              location: {
                address: locationElement,
                latitude: 0,
                longitude: 0,
              },
              startDate,
              endDate: startDate,
              categoryId: categoryElement || 'default',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          })
          .filter(event => event.title.length > 0);
      });

      this.logger.debug(`Found ${events.length} events after filtering`);

      // Begrenze die Anzahl der Ergebnisse pro Tag
      const maxResultsPerDay = this.config.maxResults || 10;
      const limitedEvents = events.slice(0, maxResultsPerDay);

      this.logger.debug(
        `Returning ${limitedEvents.length} events for this day (maxResults: ${maxResultsPerDay})`,
      );

      const result = {
        events: limitedEvents.map((event: Omit<Event, 'id'>) => ({
          ...event,
          id: crypto.randomUUID(),
        })),
        hasMorePages: events.length > maxResultsPerDay,
      };

      return result;
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
      this.logger.debug('Warte auf Cookie-Banner...');
      await page
        .waitForSelector('button[data-testid="uc-accept-all-button"]', { timeout: 2500 })
        .then(async () => {
          this.logger.debug('Cookie-Banner gefunden, klicke Akzeptieren...');
          await page.click('button[data-testid="uc-accept-all-button"]');
          this.logger.debug('Cookie-Banner akzeptiert');
        })
        .catch(() => {
          this.logger.debug('Kein Cookie-Banner gefunden');
        });
    } catch (error) {
      this.logger.error('Fehler beim Behandeln des Cookie-Banners:', error);
      throw error;
    }
  }

  extractDateFromUrl(url: string): Date | null {
    const dateMatch = url.match(/tag\/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }
    return null;
  }

  generateUrlForDate(date: Date): string {
    const formattedDate = date.toISOString().split('T')[0];
    return `${this.config.baseUrl}/${this.config.paginationPattern.replace('{date}', formattedDate)}`;
  }

  generateUrl(options: ScraperOptions): string {
    if (options.startDate) {
      return this.generateUrlForDate(options.startDate);
    }
    return this.config.baseUrl;
  }

  validateConfig(): boolean {
    return !!(this.config.baseUrl && this.config.dateFormat && this.config.paginationPattern);
  }
}
