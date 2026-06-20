import { DateTime } from 'luxon';

export class DateTimeUtils {
  private static readonly BERLIN_TIMEZONE = 'Europe/Berlin';

  /**
   * Konvertiert eine UTC-Zeit in die Berliner Zeitzone
   * @param utcDate Die UTC-Zeit als ISO-String oder Date-Objekt
   * @returns {Date | null} Date-Objekt in der Berliner Zeitzone oder null bei Fehler
   */
  public static convertUTCToBerlinTime(utcDate: string | Date): string | null {
    if (!utcDate) return null;
    try {
      const date =
        typeof utcDate === 'string'
          ? DateTime.fromISO(utcDate, { zone: 'utc' })
          : DateTime.fromJSDate(utcDate, { zone: 'utc' });
      if (!date.isValid) return null;
      const berlinDate = date.setZone(this.BERLIN_TIMEZONE);
      return berlinDate.toISO();
    } catch (error) {
      console.error('Error converting UTC to Berlin time:', error);
      return null;
    }
  }

  /**
   * Gibt die aktuelle Zeit in der Berliner Zeitzone zurück
   * @returns {string} ISO-String der aktuellen Berliner Zeit
   */
  public static getBerlinTime(): string {
    return DateTime.now().setZone(this.BERLIN_TIMEZONE).toISO() || '';
  }
}
