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
      // Parse das Datum und setze es explizit als UTC
      const date = typeof utcDate === 'string' 
        ? DateTime.fromISO(utcDate, { zone: 'utc' })
        : DateTime.fromJSDate(utcDate, { zone: 'utc' });

      if (!date.isValid) return null;

      // Konvertiere zu Berliner Zeit
      const berlinDate = date.setZone(this.BERLIN_TIMEZONE);
      return berlinDate.toISO();
    } catch (error) {
      console.error('Error converting UTC to Berlin time:', error);
      return null;
    }
  }

  /**
   * Berechnet die Zeitzonenverschiebung für eine gegebene Zeitzone
   * @param timezone Die Zeitzone (z.B. 'Europe/Berlin')
   * @returns {number} Die Zeitzonenverschiebung in Millisekunden
   */
  private static getTimezoneOffset(timezone: string): number {
    const now = new Date();
    const utcTime = now.getTime();
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
    return localTime - utcTime;
  }

  /**
   * Gibt die aktuelle Zeit in UTC zurück
   * @returns {string} ISO-String der aktuellen UTC-Zeit
   */
  public static getUTCTime(): string {
    return DateTime.utc().toISO() || '';
  }

  /**
   * Gibt die aktuelle Zeit in der Berliner Zeitzone zurück
   * @returns {string} ISO-String der aktuellen Berliner Zeit
   */
  public static getBerlinTime(): string {
    return DateTime.now().setZone(this.BERLIN_TIMEZONE).toISO() || '';
  }

  /**
   * Formatiert ein UTC-Datum im deutschen Format
   * @param utcDate Das UTC-Datum als ISO-String oder Date-Objekt
   * @returns {string} Datum im Format DD.MM.YYYY
   */
  public static formatGermanDate(utcDate: string | Date): string {
    const date = typeof utcDate === 'string' 
      ? DateTime.fromISO(utcDate, { zone: 'utc' })
      : DateTime.fromJSDate(utcDate, { zone: 'utc' });

    if (!date.isValid) return '';

    return date.setZone(this.BERLIN_TIMEZONE).toFormat('dd.MM.yyyy');
  }

  /**
   * Formatiert eine UTC-Uhrzeit im deutschen Format
   * @param utcDate Das UTC-Datum mit der zu formatierenden Uhrzeit
   * @returns {string} Uhrzeit im Format HH:mm
   */
  public static formatGermanTime(utcDate: string | Date): string {
    const date = typeof utcDate === 'string' 
      ? DateTime.fromISO(utcDate, { zone: 'utc' })
      : DateTime.fromJSDate(utcDate, { zone: 'utc' });

    if (!date.isValid) return '';

    return date.setZone(this.BERLIN_TIMEZONE).toFormat('HH:mm');
  }
} 