import { DateTime } from 'luxon';

export class DateTimeUtils {
  private static readonly BERLIN_TIMEZONE = 'Europe/Berlin';

  /**
   * Gibt die aktuelle Zeit in der Berliner Zeitzone zurück.
   * Wird für Persistenz (createdAt/updatedAt) und API-Envelope-Timestamps verwendet.
   */
  public static getBerlinTime(): string {
    return DateTime.now().setZone(this.BERLIN_TIMEZONE).toISO() || '';
  }
}
