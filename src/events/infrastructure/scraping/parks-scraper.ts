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
export class ParksScraper implements BaseScraper {
  private readonly logger = new Logger(ParksScraper.name);
  private config: ScraperConfig;
  private readonly defaultConfig: ScraperConfig = {
    baseUrl: 'https://www.parks-nuernberg.de/kalender/',
    dateFormat: 'DD.MM.YYYY',
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
    this.config.maxResults = options.maxResults;
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
      await page.goto(url, { timeout: puppeteerManager.getConfig().timeout });

      await page.waitForSelector('.em-view-container', {
        timeout: puppeteerManager.getConfig().timeout,
      });

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.em-event.em-item');
        console.log(`Found ${eventElements.length} event elements`);

        // Hilfsfunktion zur Konvertierung deutscher Monatsnamen
        const convertGermanDate = (dateStr: string): string => {
          const monthMap: { [key: string]: string } = {
            Januar: '01',
            Februar: '02',
            März: '03',
            April: '04',
            Mai: '05',
            Juni: '06',
            Juli: '07',
            August: '08',
            September: '09',
            Oktober: '10',
            November: '11',
            Dezember: '12',
          };

          // Extrahiere Tag, Monat und Jahr
          const match = dateStr.match(/(\d{1,2})\.\s*([A-Za-zäöüß]+)\s*(\d{4})/);
          if (!match) {
            console.log(`Konnte Datum nicht parsen: ${dateStr}`);
            return '';
          }

          const [_, day, month, year] = match;
          const monthNumber = monthMap[month];
          if (!monthNumber) {
            console.log(`Unbekannter Monat: ${month}`);
            return '';
          }

          return `${year}-${monthNumber}-${day.padStart(2, '0')}`;
        };

        return Array.from(eventElements)
          .map(element => {
            const titleElement = element.querySelector('h3 a')?.textContent?.trim() || '';
            const descriptionElement =
              element.querySelector('.em-item-desc')?.textContent?.trim() || '';

            // Extrahiere Datum
            const dateElement = element.querySelector('.em-event-date')?.textContent?.trim() || '';
            const timeElement = element.querySelector('.em-event-time')?.textContent?.trim() || '';
            const locationElement =
              element.querySelector('.em-event-location a')?.textContent?.trim() || '';

            // Konvertiere deutsches Datum ins ISO-Format
            let isoDate = '';
            let fromTime = '00:00';
            let toTime = '23:59';

            if (dateElement) {
              isoDate = convertGermanDate(dateElement);
              if (!isoDate) {
                return null;
              }
            }

            if (timeElement) {
              const timeMatch = timeElement.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
              if (timeMatch) {
                fromTime = timeMatch[1];
                toTime = timeMatch[2];
              } else {
                const singleTimeMatch = timeElement.match(/(\d{2}:\d{2})/);
                if (singleTimeMatch) {
                  fromTime = singleTimeMatch[1];
                  // Setze Endzeit auf eine Stunde später
                  const [hours, minutes] = fromTime.split(':');
                  const end = new Date();
                  end.setHours(Number(hours) + 1, Number(minutes), 0, 0);
                  toTime = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
                }
              }
            }

            if (!isoDate) {
              return null;
            }

            return {
              title: titleElement,
              description: descriptionElement,
              location: {
                address: locationElement || 'PARKS Nürnberg',
                latitude: 49.453872,
                longitude: 11.077298,
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
          .filter(
            event =>
              event !== null &&
              event.title.length > 0 &&
              event.dailyTimeSlots &&
              event.dailyTimeSlots.length > 0,
          );
      });

      this.logger.debug(`Found ${events.length} events after filtering`);

      const maxResults = this.config.maxResults || 10;
      // Filtere Events nach Zeitraum, falls Optionen übergeben wurden
      let filteredEvents = events;
      if (options && options.startDate && options.endDate) {
        const start =
          options.startDate instanceof Date ? options.startDate : new Date(options.startDate);
        const end = options.endDate instanceof Date ? options.endDate : new Date(options.endDate);
        filteredEvents = events.filter(event => {
          if (!event.dailyTimeSlots || event.dailyTimeSlots.length === 0) return false;
          const eventDate = new Date(event.dailyTimeSlots[0].date);
          return eventDate >= start && eventDate <= end;
        });
      }
      this.logger.debug(`Found ${filteredEvents.length} events after date filtering`);
      const limitedEvents = filteredEvents.slice(0, maxResults);
      this.logger.debug(
        `Returning ${limitedEvents.length} events (limited by maxResults: ${maxResults})`,
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

  generateUrlForDate(date: Date): string {
    return this.config.baseUrl;
  }

  generateUrl(options: ScraperOptions): string {
    return this.config.baseUrl;
  }

  validateConfig(): boolean {
    return !!(this.config.baseUrl && this.config.dateFormat);
  }

  extractDateFromUrl(url: string): Date | null {
    return null;
  }
}
