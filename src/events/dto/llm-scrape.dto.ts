import { IsString, IsUrl, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO für LLM-basierte Event-Extraktion
 */
export class LlmScrapeDto {
  /**
   * URL der Seite, von der Events extrahiert werden sollen
   */
  @IsUrl()
  @IsString()
  url: string;

  /**
   * Ob Fallback zu Puppeteer-Scraper verwendet werden soll
   * Default: true
   */
  @IsOptional()
  @IsBoolean()
  useFallback?: boolean = true;
}
