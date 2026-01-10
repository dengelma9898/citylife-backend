import { Event } from '../../../interfaces/event.interface';

/**
 * Interface für LLM-basierte Event-Extraktoren
 */
export interface LlmExtractor {
  /**
   * Extrahiert Events aus HTML-Inhalt
   * @param html - Bereinigtes HTML
   * @returns Array von Events (Partial<Event>, da id/timestamps später hinzugefügt werden)
   */
  extractEvents(html: string): Promise<Partial<Event>[]>;
}
