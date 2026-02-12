/**
 * Fehler bei der Verarbeitung einer einzelnen CSV-Zeile
 */
export interface CsvRowError {
  /** Zeilen-Index in der CSV-Datei (1-basiert, Header nicht mitgezählt) */
  readonly rowIndex: number;
  /** Betroffenes Feld (falls bekannt) */
  readonly field?: string;
  /** Fehlermeldung */
  readonly message: string;
  /** Wert, der den Fehler verursacht hat */
  readonly value?: any;
}

/**
 * Ergebnis der Verarbeitung einer einzelnen CSV-Zeile
 */
export interface CsvRowResult {
  /** Zeilen-Index in der CSV-Datei (1-basiert, Header nicht mitgezählt) */
  readonly rowIndex: number;
  /** Ob das Event erfolgreich erstellt wurde */
  readonly success: boolean;
  /** ID des erstellten Events (nur bei Erfolg) */
  readonly eventId?: string;
  /** Ob die Zeile wegen eines Duplikats übersprungen wurde */
  readonly skipped?: boolean;
  /** ID des existierenden Events bei Duplikat */
  readonly duplicateEventId?: string;
  /** Liste der aufgetretenen Fehler */
  readonly errors: CsvRowError[];
}

/**
 * Gesamtergebnis des CSV-Imports
 */
export interface CsvImportResult {
  /** Gesamtzahl der verarbeiteten Zeilen */
  readonly totalRows: number;
  /** Anzahl erfolgreich erstellter Events */
  readonly successful: number;
  /** Anzahl fehlgeschlagener Zeilen */
  readonly failed: number;
  /** Anzahl übersprungener Duplikate */
  readonly skipped: number;
  /** Detaillierte Ergebnisse pro Zeile */
  readonly results: CsvRowResult[];
}
