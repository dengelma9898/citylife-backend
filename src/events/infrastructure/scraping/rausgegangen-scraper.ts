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

      // Warte auf die horizontalen Scroll-Container
      await page.waitForSelector('#horizontal-scroll', {
        timeout: 10000,
        visible: true,
      });

      this.logger.debug('Horizontal scroll containers found, starting to extract events...');

      const events = await page.evaluate(() => {
        const scrollContainers = document.querySelectorAll('#horizontal-scroll');
        console.log(`Found ${scrollContainers.length} horizontal scroll containers`);

        const allEvents = [];

        scrollContainers.forEach(container => {
          const eventElements = container.querySelectorAll('.event-tile-text');

          eventElements.forEach(element => {
            const dateTimeElement = element.querySelector('.text-sm')?.textContent?.trim() || '';
            const titleElement = element.querySelector('h4.text-base')?.textContent?.trim() || '';
            const locationElement =
              element.querySelector('.text-sm.opacity-70.truncate')?.textContent?.trim() || '';
            const priceElement =
              element.querySelector('.text-sm.text-primary.truncate.h-4')?.textContent?.trim() ||
              '';

            // Extrahiere Datum und Zeit
            const [dateTime, time] = dateTimeElement.split('|').map(s => s.trim());
            const [_, date] = dateTime.split(', ').map(s => s.trim()); // Ignoriere den Wochentag
            const [day, month] = date.split('.').map(s => s.trim());
            const currentYear = new Date().getFullYear();
            const isoDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // Extrahiere die Uhrzeit
            const [hours, minutes] = time.split(':').map(s => s.trim());
            const fromTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

            // Verwende die gleiche Zeit für from und to
            const toTime = fromTime;

            allEvents.push({
              title: titleElement,
              description: `${locationElement}${priceElement ? ` - ${priceElement}` : ''}`,
              location: {
                address: locationElement,
                latitude: 0,
                longitude: 0,
              },
              startDate: `${isoDate} ${fromTime}`,
              endDate: `${isoDate} ${toTime}`,
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
            });
          });
        });

        return allEvents.filter(event => event.title.length > 0);
      });

      // Konvertiere die Datumsangaben außerhalb von page.evaluate()
      const convertedEvents = events.map(event => {
        const dateObj = new Date(event.startDate);
        return {
          ...event,
          startDate: DateTimeUtils.convertUTCToBerlinTime(dateObj) || event.startDate,
          endDate: DateTimeUtils.convertUTCToBerlinTime(dateObj) || event.endDate,
        };
      });

      this.logger.debug(`Found ${convertedEvents.length} events after filtering`);

      // Begrenze die Anzahl der Ergebnisse pro Tag
      const maxResultsPerDay = this.config.maxResults || 10;
      const limitedEvents = convertedEvents.slice(0, maxResultsPerDay);

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
}
