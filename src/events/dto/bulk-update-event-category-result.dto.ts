import { Event } from '../interfaces/event.interface';

/**
 * Ergebnis der Kategorie-Aktualisierung für ein einzelnes Event
 */
export interface BulkUpdateEventCategoryItemResult {
  readonly eventId: string;
  readonly success: boolean;
  readonly event?: Event;
  readonly message?: string;
}

/**
 * Gesamtergebnis des Bulk-Kategorie-Updates
 */
export interface BulkUpdateEventCategoryResult {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly results: BulkUpdateEventCategoryItemResult[];
}
