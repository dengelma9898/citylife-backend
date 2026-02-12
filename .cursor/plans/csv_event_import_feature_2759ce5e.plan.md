---
name: CSV Event Import Feature
overview: Implementierung eines CSV-Import-Features für Events mit automatischer Location-Auflösung, Kategorie-Mapping und detaillierter Fehlerbehandlung. Alle CSV-Zeilen werden verarbeitet, auch bei Fehlern.
todos:
  - id: "1"
    content: CSV-Parsing Library (csv-parse) zu package.json hinzufügen
    status: completed
  - id: "2"
    content: CsvImportService erstellen mit CSV-Parsing, Location-Auflösung, Kategorie-Mapping, Duplikatsprüfung und Event-Erstellung
    status: completed
  - id: 2a
    content: EventsService.findByTitleAndDate() Methode für Duplikatsprüfung implementieren
    status: completed
  - id: "3"
    content: DTOs für CSV-Import-Ergebnisse erstellen (CsvImportResult, CsvRowResult, CsvRowError)
    status: completed
  - id: "4"
    content: CSV File Validation Pipe erstellen oder FileValidationPipe erweitern
    status: completed
  - id: "5"
    content: Controller-Endpunkt POST /events/import/csv implementieren
    status: completed
  - id: "6"
    content: LocationModule zu EventsModule hinzufügen
    status: completed
  - id: "7"
    content: CsvImportService zu EventsModule als Provider hinzufügen
    status: completed
  - id: "8"
    content: Unit-Tests für CsvImportService schreiben
    status: completed
  - id: "9"
    content: Controller-Tests für CSV-Import-Endpunkt schreiben
    status: completed
isProject: false
---

# CSV Event Import Feature

## Übersicht

Implementierung eines neuen Endpunkts `POST /events/import/csv` für den Import von Events aus CSV-Dateien. Die CSV-Dateien haben eine andere Struktur als die normale Event-Struktur und müssen transformiert werden. Locations werden automatisch via HERE API aufgelöst, Kategorien von Text zu IDs gemappt. Bei Fehlern wird der Prozess nicht abgebrochen - alle Zeilen werden verarbeitet und detaillierte Fehlerinformationen zurückgegeben.

## CSV-Struktur (Input)

Die CSV-Datei hat folgende Spalten:

- Titel, Beschreibung, Startdatum, Enddatum, Startzeit, Endzeit, Veranstaltungsort, Kategorien, Preis, Tickets, E-Mail, Telefon, Webseite, Social Media, Bild-URL, Detail-URL

Beispiel aus `curt-events-data.csv`:

- Veranstaltungsort: "VISCHERS KULTURLADEN, Hufelandstraße 4, 90419 Nürnberg"
- Kategorien: "Kindertheater", "Musik und Tee", etc.

## Event-Struktur (Output)

Events benötigen:

- `title`, `description`, `location` (address, latitude, longitude), `categoryId`, `dailyTimeSlots`
- Optional: `price`, `priceString`, `contactEmail`, `contactPhone`, `website`, `socialMedia`, etc.

## Implementierung

### 1. Dependencies

**package.json**: CSV-Parsing Library hinzufügen

- `csv-parse` (oder `papaparse`) für CSV-Parsing
- Typen: `@types/csv-parse` (falls benötigt)

### 2. CSV Import Service

**Datei**: `src/events/application/services/csv-import.service.ts`

Service-Klasse mit folgenden Methoden:

- `importFromCsv(file: Express.Multer.File): Promise<CsvImportResult>`
  - Parst CSV-Datei
  - Verarbeitet jede Zeile einzeln
  - Sammelt Fehler ohne abzubrechen
  - Gibt detailliertes Ergebnis zurück
- `parseCsvRow(row: any, rowIndex: number): Promise<CsvRowResult>`
  - Validiert einzelne CSV-Zeile
  - Transformiert CSV-Daten zu Event-Daten
  - Löst Location via LocationService auf
  - Mappt Kategorie von Text zu ID
  - **Prüft auf Duplikate** (Titel + Datum aus dailyTimeSlots)
  - Erstellt Event via EventsService (nur wenn kein Duplikat)
  - Gibt Ergebnis mit Fehlern zurück
- `resolveLocation(address: string): Promise<{ address: string; latitude: number; longitude: number }>`
  - Nutzt LocationService.searchLocations()
  - Nimmt ersten Treffer (oder wirft Fehler)
  - Gibt Location-Objekt zurück
- `mapCategoryToId(categoryName: string): Promise<string>`
  - Lädt alle Kategorien via EventCategoriesService
  - Sucht nach passender Kategorie (case-insensitive, Teilstring-Matching)
  - Gibt Kategorie-ID zurück oder 'default' als Fallback
- `transformCsvRowToEventData(csvRow: CsvRow): Partial<CreateEventDto>`
  - Konvertiert CSV-Felder zu Event-Daten
  - Erstellt dailyTimeSlots aus Startdatum/Enddatum/Startzeit/Endzeit
  - Parst Preis (unterstützt "Kostenlos", "ab X€", etc.)
  - Extrahiert Social Media Links
- `checkForDuplicate(title: string, dates: string[]): Promise<Event | null>`
  - Sucht nach existierenden Events mit gleichem Titel
  - Prüft ob mindestens ein Datum aus dailyTimeSlots übereinstimmt
  - Gibt gefundenes Event zurück oder null wenn kein Duplikat

### 3. DTOs

**Datei**: `src/events/dto/csv-import-result.dto.ts`

```typescript
export interface CsvRowError {
  rowIndex: number;
  field?: string;
  message: string;
  value?: any;
}

export interface CsvRowResult {
  rowIndex: number;
  success: boolean;
  eventId?: string;
  errors: CsvRowError[];
}

export interface CsvImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  results: CsvRowResult[];
}
```

**Datei**: `src/events/dto/csv-row.dto.ts`

Interfaces für CSV-Zeilen-Struktur (basierend auf CSV-Spalten)

### 4. Controller-Endpunkt

**Datei**: `src/events/events.controller.ts`

Neuer Endpunkt:

```typescript
@Post('import/csv')
@UseInterceptors(FileInterceptor('file'))
@ApiOperation({ summary: 'Importiert Events aus CSV-Datei' })
@ApiResponse({ status: 200, description: 'Import abgeschlossen', type: CsvImportResult })
public async importFromCsv(
  @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
): Promise<CsvImportResult>
```

**WICHTIG**: FileValidationPipe erweitern oder neuen Pipe für CSV erstellen:

- MIME-Type: `text/csv` oder `application/vnd.ms-excel`
- Dateigröße-Limit anpassen (CSV-Dateien können größer sein)

### 5. Module-Integration

**Datei**: `src/events/events.module.ts`

- `CsvImportService` als Provider hinzufügen
- `LocationModule` importieren (falls noch nicht vorhanden)
- `EventCategoriesModule` ist bereits importiert

### 6. Duplikatsprüfung

**Vor der Event-Erstellung** wird geprüft, ob bereits ein Event mit:

- Gleichem Titel (case-insensitive, normalisiert)
- Mindestens einem übereinstimmenden Datum aus dailyTimeSlots

existiert.

**Implementierung**:

- Neue Methode in `EventsService`: `findByTitleAndDate(title: string, dates: string[]): Promise<Event | null>`
  - Lädt alle Events aus Firestore
  - Filtert nach Titel (case-insensitive, trim)
  - Prüft ob mindestens ein Datum aus dailyTimeSlots übereinstimmt
  - Gibt erstes gefundenes Event zurück oder null
- In `CsvImportService.parseCsvRow()`:
  - Nach Transformation zu Event-Daten
  - Vor Event-Erstellung: `checkForDuplicate()` aufrufen
  - Wenn Duplikat gefunden:
    - `success: false`, `skipped: true`
    - `duplicateEventId` setzen
    - Fehler hinzufügen: "Event mit Titel '{title}' und Datum '{date}' existiert bereits (ID: {duplicateEventId})"
    - Event wird **nicht** erstellt

### 7. Fehlerbehandlung

- Jede Zeile wird einzeln verarbeitet
- Fehler werden in `CsvRowError[]` gesammelt
- Fehler enthalten: Zeilen-Index, Feld-Name (falls bekannt), Fehlermeldung, Wert
- Bei Duplikaten: Event wird übersprungen, aber als Fehler markiert
- Bei Location-Fehlern: "Location konnte nicht aufgelöst werden: {address}"
- Bei Kategorie-Fehlern: "Kategorie '{categoryName}' nicht gefunden, verwende 'default'"
- Bei Validierungsfehlern: Detaillierte Feld-Fehler
- Bei Event-Erstellungsfehlern: Fehler-Message vom Service

### 8. Transformationen

**Datum/Zeit**:

- Startdatum/Enddatum: CSV-Format (YYYY-MM-DD) zu ISO-Format
- Startzeit/Endzeit: CSV-Format (HH:mm) zu dailyTimeSlots
- Wenn Startdatum = Enddatum: Ein dailyTimeSlot
- Wenn Startdatum != Enddatum: Mehrere dailyTimeSlots (pro Tag)

**Preis**:

- "Kostenlos" → `price: 0`, `priceString: "Kostenlos"`
- "ab X€" → `price: X`, `priceString: "ab X€"`
- Leer → `price: null`

**Kategorien**:

- CSV: "Kindertheater", "Musik und Tee", etc.
- Mapping zu Kategorie-IDs via EventCategoriesService
- Fallback: "default" wenn nicht gefunden

**Location**:

- CSV: "VISCHERS KULTURLADEN, Hufelandstraße 4, 90419 Nürnberg"
- Via LocationService.searchLocations() auflösen
- Ersten Treffer verwenden (oder Fehler wenn keine Treffer)

**Social Media**:

- CSV: "Social Media" Spalte kann Instagram/Facebook/TikTok Links enthalten
- Parsen und in `socialMedia` Objekt extrahieren

### 9. Tests

**Datei**: `src/events/application/services/csv-import.service.spec.ts`

- Unit-Tests für CSV-Parsing
- Unit-Tests für Location-Auflösung
- Unit-Tests für Kategorie-Mapping
- Unit-Tests für Duplikatsprüfung
- Unit-Tests für Transformationen
- Unit-Tests für Fehlerbehandlung
- Integration-Tests für vollständigen Import-Prozess

**Datei**: `src/events/events.controller.spec.ts`

- Controller-Tests für CSV-Import-Endpunkt
- File-Upload-Validierung
- Response-Format-Validierung

## Dateien

### Neue Dateien

- `src/events/application/services/csv-import.service.ts`
- `src/events/application/services/csv-import.service.spec.ts`
- `src/events/dto/csv-import-result.dto.ts`
- `src/events/dto/csv-row.dto.ts`

### Geänderte Dateien

- `src/events/events.controller.ts` (neuer Endpunkt)
- `src/events/events.module.ts` (CsvImportService, LocationModule)
- `package.json` (csv-parse dependency)
- `src/core/pipes/file-validation.pipe.ts` (oder neuer CsvFileValidationPipe)

## Abhängigkeiten

- `LocationModule` muss importiert werden
- `EventCategoriesModule` ist bereits importiert
- `EventsService` für Event-Erstellung und Duplikatsprüfung
- `LocationService` für Location-Auflösung
- `EventCategoriesService` für Kategorie-Mapping

## Duplikatsprüfung Details

**Vergleichskriterien**:

1. **Titel**: Case-insensitive Vergleich, Whitespace normalisiert (trim)
2. **Datum**: Mindestens ein Datum aus `dailyTimeSlots[].date` muss übereinstimmen

**Beispiel**:

- CSV-Zeile: Titel="DU UND ICH & ICH UND DU", Startdatum="2026-02-09"
- Existierendes Event: title="Du und ich & ich und du", dailyTimeSlots=[{date: "2026-02-09"}]
- → **Duplikat erkannt**, Event wird nicht erstellt

**Performance**:

- Für große CSV-Imports: Alle Events einmal laden und im Memory cachen
- Oder: Firestore Query mit Filter optimieren (falls möglich)

