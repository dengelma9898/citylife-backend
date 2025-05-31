import { Event } from '../../interfaces/event.interface';
import { EventCategory } from '../../enums/event-category.enum';

export interface ScraperConfig {
  baseUrl: string;
  dateFormat: string;
  paginationPattern?: string;
  maxPages?: number;
  maxResults?: number;
  fixedParams?: Record<string, string>;
  browserConfig?: {
    headless: boolean;
    viewport: {
      width: number;
      height: number;
      deviceScaleFactor: number;
      isMobile: boolean;
      hasTouch: boolean;
    };
    userAgent: string;
  };
}

export interface ScraperResult {
  events: Event[];
  nextPageUrl?: string;
  hasMorePages: boolean;
}

export interface ScraperOptions {
  timeFrame?: string;
  category?: EventCategory | null;
  maxResults?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
}

export interface BaseScraper {
  /**
   * Initialisiert den Scraper mit der Konfiguration
   */
  initialize(config: ScraperConfig): void;

  /**
   * Holt Events für ein bestimmtes Datum
   */
  scrapeEventsForDate(date: Date): Promise<Event[]>;

  /**
   * Holt Events für einen Datumsbereich
   */
  scrapeEventsForDateRange(startDate: Date, endDate: Date): Promise<Event[]>;

  /**
   * Holt Events von einer bestimmten URL
   */
  scrapeEventsFromUrl(url: string): Promise<ScraperResult>;

  /**
   * Holt Events mit verschiedenen Optionen
   */
  scrapeEvents(options: ScraperOptions): Promise<Event[]>;

  /**
   * Extrahiert das Datum aus einer URL
   */
  extractDateFromUrl(url: string): Date | null;

  /**
   * Generiert eine URL für ein bestimmtes Datum
   */
  generateUrlForDate(date: Date): string;

  /**
   * Generiert eine URL basierend auf den Scraper-Optionen
   */
  generateUrl(options: ScraperOptions): string;

  /**
   * Validiert die Scraper-Konfiguration
   */
  validateConfig(): boolean;

  /**
   * Behandelt den Cookie-Banner falls vorhanden
   */
  handleCookieBanner?(page: any): Promise<void>;
}

export enum ScraperType {
  EVENTFINDER = 'eventfinder',
  CURT = 'curt',
  RAUSGEGANGEN = 'rausgegangen'
} 