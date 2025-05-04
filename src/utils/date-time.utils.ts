export class DateTimeUtils {
  /**
   * Gibt die aktuelle UTC-Zeit als ISO-String zurück
   * @returns {string} ISO-String der aktuellen UTC-Zeit
   */
  public static getUTCTime(): string {
    return new Date().toISOString();
  }

  /**
   * Konvertiert eine UTC-Zeit in die Berliner Zeitzone
   * @param utcDate Die UTC-Zeit als ISO-String oder Date-Objekt
   * @returns {Date} Date-Objekt in der Berliner Zeitzone
   */
  public static convertUTCToBerlinTime(utcDate: string | Date): Date {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    return new Date(date.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
  }

  /**
   * Formatiert ein UTC-Datum im deutschen Format
   * @param utcDate Das UTC-Datum als ISO-String oder Date-Objekt
   * @returns {string} Datum im Format DD.MM.YYYY
   */
  public static formatGermanDate(utcDate: string | Date): string {
    const date = this.convertUTCToBerlinTime(utcDate);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatiert eine UTC-Uhrzeit im deutschen Format
   * @param utcDate Das UTC-Datum mit der zu formatierenden Uhrzeit
   * @returns {string} Uhrzeit im Format HH:mm
   */
  public static formatGermanTime(utcDate: string | Date): string {
    const date = this.convertUTCToBerlinTime(utcDate);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Gibt die aktuelle Zeit in der Berliner Zeitzone als ISO-String zurück
   * @returns {string} ISO-String der aktuellen Berliner Zeit
   * @deprecated Verwenden Sie stattdessen getUTCTime() und konvertieren Sie die Zeit bei Bedarf mit convertUTCToBerlinTime()
   */
  public static getBerlinTime(): string {
    const now = new Date();
    const berlinTime = new Date(now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }));
    return berlinTime.toISOString();
  }
} 