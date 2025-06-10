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
            const title = element.querySelector('.titel')?.textContent?.trim() || '';
            const datetimeContainer = element.querySelector('.datetime-mobile');
            let dateText = '';
            let timeText = '';
            if (datetimeContainer) {
              const nodes = Array.from(datetimeContainer.childNodes);
              // Suche nach deutschem Datum
              const dateNode = nodes.find(
                n =>
                  n.nodeType === Node.TEXT_NODE &&
                  n.textContent.trim().match(/^\d{2}\.\d{2}\.\d{4}$/),
              );
              if (dateNode) dateText = dateNode.textContent.trim();
              // Suche nach Uhrzeit
              const timeNode = nodes.find(
                n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().match(/^\d{2}:\d{2}$/),
              );
              if (timeNode) timeText = timeNode.textContent.trim();
            }

            let fromTime = timeText || '00:00';
            let toTime = timeText || '23:59';
            if (timeText) {
              const [hours, minutes] = timeText.split(':');
              if (hours && minutes) {
                const end = new Date();
                end.setHours(Number(hours) + 1, Number(minutes), 0, 0);
                toTime = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
              }
            }

            const locationText =
              element.querySelector('.card-body-footer')?.textContent?.trim() || '';
            const description = element.querySelector('.beschreibung')?.textContent?.trim() || '';

            // Konvertiere deutsches Datum ins ISO-Format
            let isoDate = '';
            if (dateText) {
              const [day, month, year] = dateText.split('.');
              if (day && month && year) {
                isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
            }

            if (!isoDate) {
              return null;
            }

            return {
              title,
              description,
              location: {
                address: locationText,
                latitude: 0,
                longitude: 0,
              },
              dailyTimeSlots: [
                {
                  date: isoDate,
                  from: fromTime,
                  to: toTime,
                },
              ],
              categoryId: 'default',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          })
          .filter(event => event && event.title.length > 0);
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

      this.logger.debug(
        `Found ${events.length} events, filtered to ${filteredEvents.length}, limited to ${limitedEvents.length}`,
      );

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
      const cookieButton = await page.$(
        '.cookie-banner button, .cookie-notice button, #cookie-notice button',
      );
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('[CurtScraper] Fehler beim Behandeln des Cookie-Banners:', error);
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
