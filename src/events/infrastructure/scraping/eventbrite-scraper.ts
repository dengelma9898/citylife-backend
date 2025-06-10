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
export class EventbriteScraper implements BaseScraper {
  private readonly logger = new Logger(EventbriteScraper.name);
  private config: ScraperConfig;
  private readonly defaultConfig: ScraperConfig = {
    baseUrl: 'https://www.eventbrite.de/d/germany--n%C3%BCrnberg/all-events/',
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
    let page: Page;
    try {
      page = await puppeteerManager.getPage();
      await page.goto(url, {
        timeout: puppeteerManager.getConfig().timeout,
        waitUntil: 'networkidle2',
      });
      
      // Cookie-Banner behandeln
      // await this.handleCookieBanner(page);

      // Warten Sie gezielt auf das Event-Container-Element
      await page.waitForSelector('.search-results-panel-content__events', {
        timeout: 15000,
        visible: true,
      });

      // Füge eine kleine Verzögerung hinzu, um das deutsche Format zu gewährleisten
      await new Promise(resolve => setTimeout(resolve, 3200));
      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.event-card');
        return Array.from(eventElements).map(element => {
          const eventCardDetails = element.querySelector('.event-card-details');
          const titleElement = eventCardDetails?.querySelector('.event-card-link h3');
          const dateTimeElement = eventCardDetails?.querySelector('.event-card__clamp-line--one');
          const locationElement = eventCardDetails?.querySelectorAll('.event-card__clamp-line--one')[1];
          const locationSpan = locationElement?.nextElementSibling;
          const priceElement = locationSpan?.nextElementSibling?.querySelector('p');

          const title = titleElement?.textContent?.trim() || '';
          const dateTimeText = dateTimeElement?.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';
          const priceText = priceElement?.textContent?.trim() || '';

          // Nur deutsches Datumsformat parsen
          let eventDate = '';
          let fromTime = '';
          // Neue Regex für z.B. 'So., 22. Juni, 08:00'
          const germanMatch = dateTimeText.match(/([A-Za-zäöüÄÖÜß]{2,4})\.,\s*(\d{1,2})\.\s*([A-Za-zäöüÄÖÜß]+),\s*(\d{2}:\d{2})/);
          if (germanMatch) {
            const [_, day, date, month, time] = germanMatch;
            const monthMap: { [key: string]: string } = {
              'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
              'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
              'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12'
            };
            const currentYear = new Date().getFullYear();
            eventDate = `${currentYear}-${monthMap[month]}-${date.padStart(2, '0')}`;
            fromTime = time;
          }

          const price = priceText ? parseFloat(priceText.replace(/[^0-9,]/g, '').replace(',', '.')) : 0;

          return {
            title,
            description: '', // Eventbrite zeigt keine Beschreibung in der Übersicht
            location: {
              address: location,
              latitude: 0,
              longitude: 0,
            },
            dailyTimeSlots: [
              {
                date: eventDate,
                from: fromTime,
                to: '', // Endzeit ist in der Übersicht nicht verfügbar
              },
            ],
            categoryId: 'default',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ticketsNeeded: price > 0,
            price: price,
          };
        });
      });

      const maxResults = options?.maxResults || this.config.maxResults;
      const filteredEvents = events.filter(event => {
        if (!event.title || !event.dailyTimeSlots[0].date) return false;

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
        '[data-testid="cookie-banner-accept"], .cookie-banner button, .cookie-notice button',
      );
      if (cookieButton) {
        await cookieButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
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
    const params = new URLSearchParams({
      start_date: formattedDate,
      end_date: formattedDate,
    });
    return `${this.config.baseUrl}?${params.toString()}`;
  }

  generateUrl(options: ScraperOptions): string {
    const params = new URLSearchParams();
    
    if (options.startDate && options.endDate) {
      const startDate = options.startDate.toISOString().split('T')[0];
      const endDate = options.endDate.toISOString().split('T')[0];
      params.append('start_date', startDate);
      params.append('end_date', endDate);
    } else if (options.startDate) {
      const startDate = options.startDate.toISOString().split('T')[0];
      params.append('start_date', startDate);
      // Wenn nur ein Startdatum angegeben ist, setzen wir das Enddatum auf das gleiche Datum
      params.append('end_date', startDate);
    } else {
      // Wenn keine Daten angegeben sind, setzen wir das aktuelle Datum als Start- und Enddatum
      const today = new Date().toISOString().split('T')[0];
      params.append('start_date', today);
      params.append('end_date', today);
    }

    return `${this.config.baseUrl}?${params.toString()}`;
  }

  validateConfig(): boolean {
    return !!(this.config.baseUrl && this.config.dateFormat);
  }
} 