export interface BusinessCustomer {
  /**
   * Die Kunden-ID aus dem Benutzerprofil
   */
  customerId: string;

  /**
   * ISO-String des Zeitpunkts, zu dem der Kunde gescannt wurde
   */
  scannedAt: string;

  /**
   * Optionaler Preis, der bezahlt wurde
   */
  price?: number | null;

  /**
   * Optionale Anzahl der Personen
   */
  numberOfPeople?: number | null;

  /**
   * Optionale Zusatzinformationen
   */
  additionalInfo?: string | null;

  /**
   * Das aktuelle Benefit des Businesses zum Zeitpunkt des Scans
   */
  benefit: string;
} 