import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Event } from './interfaces/event.interface';
import { EventCategory } from './enums/event-category.enum';

@Injectable()
export class EventScraperService {
  private readonly logger = new Logger(EventScraperService.name);

  private async handleCookieBanner(page: puppeteer.Page): Promise<void> {
    try {
      this.logger.debug('Warte auf Cookie-Banner...');

      // Warte auf den Cookie-Banner-Button
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

  async scrapeEventFinder(
    timeFrame: string = 'naechste-woche',
    category: EventCategory | null,
    maxResults?: number,
  ): Promise<Event[]> {
    this.logger.debug(
      `Starte EventFinder Scraping für Zeitraum: ${timeFrame} und Kategorie: ${category} und maxResults: ${maxResults}`,
    );
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=375x812', // iPhone X Größe
        ],
        defaultViewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        },
      });

      const page = await browser.newPage();

      // Setze mobile User-Agent
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      );

      // Aktiviere JavaScript
      await page.setJavaScriptEnabled(true);

      // Setze mobile Emulation
      await page.emulate({
        viewport: {
          width: 375,
          height: 812,
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });

      const categoryParam = category ?? 'veranstaltungen';
      // Dynamische URL je nach Kategorie und Zeitraum
      const url = `https://www.eventfinder.de/nuernberg/${categoryParam}/${timeFrame}/`;
      this.logger.debug(`Navigiere zur EventFinder-Seite: ${url}`);
      await page.goto(url, { timeout: 60000 });

      // Behandle Cookie-Banner
      await this.handleCookieBanner(page);

      // Warte auf Event-Karten
      this.logger.debug('Warte auf Event-Karten...');
      await page.waitForSelector('.card.event', { timeout: 60000 }); // 60 Sekunden Timeout

      // Extrahiere Event-Daten
      const events = await page.evaluate(max => {
        const eventElements = document.querySelectorAll('.card.event');
        return Array.from(eventElements)
          .slice(0, max ?? 5)
          .map(element => {
            const title = element.querySelector('.titel')?.textContent?.trim() || '';
            const dateText = element.querySelector('.datetime-mobile')?.textContent?.trim() || '';
            const locationText =
              element.querySelector('.card-body-footer')?.textContent?.trim() || '';
            const description = element.querySelector('.beschreibung')?.textContent?.trim() || '';

            return {
              title,
              description,
              location: {
                address: locationText,
                latitude: 0,
                longitude: 0,
              },
              startDate: dateText,
              endDate: dateText,
              categoryId: 'default',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
      }, maxResults);

      this.logger.debug(`Erfolgreich ${events.length} Events gescraped`);

      return events.map((event: Omit<Event, 'id'>) => ({
        ...event,
        id: crypto.randomUUID(),
      }));
    } catch (error) {
      this.logger.error('Fehler beim Scraping von EventFinder:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}
