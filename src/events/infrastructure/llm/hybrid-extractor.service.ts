import { Injectable, Logger } from '@nestjs/common';
import {
  BaseScraper,
  ScraperOptions,
  ScraperResult,
  ScraperConfig,
  ScraperType,
} from '../scraping/base-scraper.interface';
import { MistralExtractorService } from './mistral-extractor.service';
import { EventNormalizerService } from './event-normalizer.service';
import { ScraperService } from '../scraping/scraper.service';
import { PuppeteerManager } from '../scraping/puppeteer.config';
import { Event } from '../../interfaces/event.interface';

/**
 * Hybrid-Extractor kombiniert LLM-basierte Extraktion mit Puppeteer-Fallback
 * Strategie: Mistral → Puppeteer-Scraper
 */
@Injectable()
export class HybridExtractorService implements BaseScraper {
  private readonly logger = new Logger(HybridExtractorService.name);
  private config: ScraperConfig;

  constructor(
    private readonly mistralExtractor: MistralExtractorService,
    private readonly eventNormalizer: EventNormalizerService,
    private readonly scraperService: ScraperService,
  ) {
    this.config = {
      baseUrl: '',
      dateFormat: 'YYYY-MM-DD',
    };
  }

  initialize(config: ScraperConfig): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(): boolean {
    return true; // Keine spezifische Konfiguration nötig
  }

  async handleCookieBanner?(page: any): Promise<void> {
    // Nicht benötigt für LLM-Extraktion, wird von Puppeteer-Fallback gehandhabt
  }

  /**
   * Hauptmethode: Extrahiert Events von einer URL
   * Versucht zuerst Mistral, dann Fallback zu Puppeteer
   */
  async scrapeEventsFromUrl(url: string, options?: ScraperOptions): Promise<ScraperResult> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:51',
        message: 'scrapeEventsFromUrl entry',
        data: { url, useFallback: (options as any)?.useFallback },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
      }),
    }).catch(() => {});
    // #endregion
    const useFallback = (options as any)?.useFallback !== false;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:53',
        message: 'useFallback determined',
        data: { useFallback },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
      }),
    }).catch(() => {});
    // #endregion
    try {
      // Versuche Mistral-Extraktion
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:56',
          message: 'before fetchHtml',
          data: { url },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H2',
        }),
      }).catch(() => {});
      // #endregion
      const html = await this.fetchHtml(url);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:58',
          message: 'after fetchHtml',
          data: { htmlLength: html.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H2',
        }),
      }).catch(() => {});
      // #endregion
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:60',
          message: 'before tryMistralExtraction',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      const events = await this.tryMistralExtraction(html);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:62',
          message: 'after tryMistralExtraction',
          data: { eventsCount: events?.length || 0, eventsIsNull: events === null },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3,H4',
        }),
      }).catch(() => {});
      // #endregion

      if (events && events.length > 0) {
        this.logger.log(`Mistral-Extraktion erfolgreich: ${events.length} Events gefunden`);
        return {
          events,
          hasMorePages: false,
        };
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:70',
          message: 'empty events, checking fallback',
          data: { useFallback },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H4',
        }),
      }).catch(() => {});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:72',
          message: 'catch block',
          data: { errorMessage: error.message, useFallback },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3,H5',
        }),
      }).catch(() => {});
      // #endregion
      this.logger.warn(`Mistral-Extraktion fehlgeschlagen: ${error.message}`);
    }

    // Fallback zu Puppeteer-Scraper nur wenn erlaubt
    if (!useFallback) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:78',
          message: 'useFallback=false, returning empty',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H1',
        }),
      }).catch(() => {});
      // #endregion
      return {
        events: [],
        hasMorePages: false,
      };
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:85',
        message: 'calling fallbackToPuppeteer',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H1',
      }),
    }).catch(() => {});
    // #endregion
    this.logger.log('Fallback zu Puppeteer-Scraper');
    return this.fallbackToPuppeteer(url);
  }

  /**
   * Versucht Mistral-Extraktion
   * @param html - HTML-Inhalt
   * @returns Events oder null bei Fehler
   */
  private async tryMistralExtraction(html: string): Promise<Event[] | null> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:95',
        message: 'tryMistralExtraction entry',
        data: { htmlLength: html.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H3',
      }),
    }).catch(() => {});
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:98',
          message: 'before mistralExtractor.extractEvents',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      const partialEvents = await this.mistralExtractor.extractEvents(html);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:100',
          message: 'after mistralExtractor.extractEvents',
          data: { partialEventsCount: partialEvents?.length || 0 },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      if (!partialEvents || partialEvents.length === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'hybrid-extractor.service.ts:102',
            message: 'empty partialEvents, returning null',
            data: {},
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'H4',
          }),
        }).catch(() => {});
        // #endregion
        return null;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:107',
          message: 'before eventNormalizer.normalize',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      const normalizedEvents = await this.eventNormalizer.normalize(partialEvents);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:109',
          message: 'after eventNormalizer.normalize',
          data: { normalizedEventsCount: normalizedEvents?.length || 0 },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      return normalizedEvents;
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:112',
          message: 'tryMistralExtraction catch',
          data: { errorMessage: error.message, errorStack: error.stack },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H3',
        }),
      }).catch(() => {});
      // #endregion
      this.logger.error(`Fehler bei Mistral-Extraktion: ${error.message}`);
      return null;
    }
  }

  /**
   * Fallback zu bestehenden Puppeteer-Scrapers
   * Versucht automatisch den passenden Scraper basierend auf der URL zu finden
   */
  private async fallbackToPuppeteer(url: string): Promise<ScraperResult> {
    // Versuche Scraper basierend auf URL-Domain zu identifizieren
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Mapping von Domain zu ScraperType
    const domainToScraper: Record<string, ScraperType> = {
      'eventfinder.de': ScraperType.EVENTFINDER,
      'curt.de': ScraperType.CURT,
      'rausgegangen.de': ScraperType.RAUSGEGANGEN,
      'eventbrite.de': ScraperType.EVENTBRITE,
      'eventbrite.com': ScraperType.EVENTBRITE,
    };

    const scraperType = domainToScraper[hostname];
    if (scraperType) {
      try {
        const events = await this.scraperService.scrapeEventsFromUrl(scraperType, url);
        return {
          events,
          hasMorePages: false,
        };
      } catch (error) {
        this.logger.error(`Puppeteer-Scraper fehlgeschlagen: ${error.message}`);
      }
    }

    // Wenn kein passender Scraper gefunden, leeres Ergebnis zurückgeben
    this.logger.warn(`Kein passender Scraper für URL gefunden: ${url}`);
    return {
      events: [],
      hasMorePages: false,
    };
  }

  /**
   * Holt HTML-Inhalt mit Puppeteer
   */
  private async fetchHtml(url: string): Promise<string> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:152',
        message: 'fetchHtml entry - using Puppeteer',
        data: { url },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H2',
      }),
    }).catch(() => {});
    // #endregion
    const puppeteerManager = PuppeteerManager.getInstance();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:155',
        message: 'before getPage',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H2,H5',
      }),
    }).catch(() => {});
    // #endregion
    const page = await puppeteerManager.getPage();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'hybrid-extractor.service.ts:157',
        message: 'after getPage, before goto',
        data: {},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'H2,H5',
      }),
    }).catch(() => {});
    // #endregion

    try {
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: puppeteerManager.getConfig().timeout,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:164',
          message: 'after goto, before content',
          data: {},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H2,H5',
        }),
      }).catch(() => {});
      // #endregion

      const html = await page.content();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'hybrid-extractor.service.ts:168',
          message: 'after content',
          data: { htmlLength: html.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'H2,H5',
        }),
      }).catch(() => {});
      // #endregion
      return html;
    } finally {
      await page.close();
    }
  }

  // BaseScraper Interface-Implementierung (nicht alle Methoden werden verwendet)

  async scrapeEvents(options: ScraperOptions): Promise<Event[]> {
    if (options.startDate && options.endDate) {
      return this.scrapeEventsForDateRange(options.startDate, options.endDate);
    }
    if (options.startDate) {
      return this.scrapeEventsForDate(options.startDate);
    }
    throw new Error('URL oder Datum muss angegeben werden');
  }

  async scrapeEventsForDate(date: Date): Promise<Event[]> {
    throw new Error('Nicht unterstützt - verwende scrapeEventsFromUrl');
  }

  async scrapeEventsForDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    throw new Error('Nicht unterstützt - verwende scrapeEventsFromUrl');
  }

  extractDateFromUrl(url: string): Date | null {
    return null; // Nicht relevant für LLM-Extraktion
  }

  generateUrlForDate(date: Date): string {
    throw new Error('Nicht unterstützt');
  }

  generateUrl(options: ScraperOptions): string {
    throw new Error('Nicht unterstützt');
  }
}
