/**
 * Struktur einer CSV-Zeile aus der Import-Datei
 * Spaltenreihenfolge: Titel, Beschreibung, Startdatum, Enddatum, Startzeit, Endzeit,
 * Veranstaltungsort, Kategorien, Preis, Tickets, E-Mail, Telefon, Webseite, Social Media, Bild-URL, Detail-URL
 */
export interface CsvRow {
  readonly Titel: string;
  readonly Beschreibung: string;
  readonly Startdatum: string;
  readonly Enddatum: string;
  readonly Startzeit: string;
  readonly Endzeit: string;
  readonly Veranstaltungsort: string;
  readonly Kategorien: string;
  readonly Preis: string;
  readonly Tickets: string;
  readonly 'E-Mail': string;
  readonly Telefon: string;
  readonly Webseite: string;
  readonly 'Social Media': string;
  readonly 'Bild-URL': string;
  readonly 'Detail-URL': string;
}
