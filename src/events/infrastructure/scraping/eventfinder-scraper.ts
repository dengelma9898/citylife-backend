import { Injectable, Logger } from '@nestjs/common';
import { BaseScraper, ScraperConfig, ScraperOptions, ScraperResult } from './base-scraper.interface';
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
    return this.scrapeEventsFromUrl(url).then(result => result.events);
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

  async scrapeEventsFromUrl(url: string): Promise<ScraperResult> {
    const puppeteerManager = PuppeteerManager.getInstance();
    let page: Page | null = null;

    try {
      this.logger.debug(`Scraping events from URL: ${url}`);
      page = await puppeteerManager.getPage();
      await page.goto(url, { timeout: puppeteerManager.getConfig().timeout });
      await this.handleCookieBanner(page);

      await page.waitForSelector('.card.event', { timeout: puppeteerManager.getConfig().timeout });

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('.card.event');
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
              const dateNode = nodes.find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().match(/^\d{2}\.\d{2}\.\d{4}$/));
              if (dateNode) dateText = dateNode.textContent.trim();
              // Suche nach Uhrzeit
              const timeNode = nodes.find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().match(/^\d{2}:\d{2}$/));
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

            const locationText = element.querySelector('.card-body-footer')?.textContent?.trim() || '';
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
              startDate: `${isoDate} ${fromTime}`,
              endDate: `${isoDate} ${toTime}`,
              dailyTimeSlots: [{
                date: isoDate,
                from: fromTime,
                to: toTime
              }],
              categoryId: 'default',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          })
          .filter(event => event && event.title.length > 0);
      });

      const maxResults = this.config.maxResults || 10;
      const limitedEvents = events.slice(0, maxResults);

      return {
        events: limitedEvents.map((event: Omit<Event, 'id'>) => ({
          ...event,
          id: crypto.randomUUID(),
        })),
        hasMorePages: events.length > maxResults,
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
      this.logger.debug('Warte auf Cookie-Banner...');
      await page
        .waitForSelector('button[data-testid="uc-accept-all-button"]', { timeout: 10000 })
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