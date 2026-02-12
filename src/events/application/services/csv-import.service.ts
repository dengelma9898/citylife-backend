import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { EventsService } from '../../events.service';
import { LocationService } from '../../../location/services/location.service';
import { EventCategoriesService } from '../../../event-categories/services/event-categories.service';
import { CsvRow } from '../../dto/csv-row.dto';
import {
  CsvImportResult,
  CsvRowResult,
  CsvRowError,
} from '../../dto/csv-import-result.dto';
import { CreateEventDto } from '../../dto/create-event.dto';
import { DailyTimeSlot } from '../../interfaces/event.interface';
import { EventCategory } from '../../../event-categories/interfaces/event-category.interface';

/** Erwartete Spalten im CsvRow-Interface */
const EXPECTED_CSV_COLUMNS = [
  'Titel',
  'Beschreibung',
  'Startdatum',
  'Enddatum',
  'Startzeit',
  'Endzeit',
  'Veranstaltungsort',
  'Kategorien',
  'Preis',
  'Tickets',
  'E-Mail',
  'Telefon',
  'Webseite',
  'Social Media',
  'Bild-URL',
  'Detail-URL',
];

/**
 * Service für den Import von Events aus CSV-Dateien
 * Verarbeitet jede Zeile einzeln und sammelt Fehler ohne abzubrechen
 */
@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly locationService: LocationService,
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  /**
   * Importiert Events aus einer CSV-Datei
   * Verarbeitet jede Zeile einzeln und bricht bei Fehlern nicht ab
   *
   * @param file - Hochgeladene CSV-Datei
   * @returns Detailliertes Import-Ergebnis
   */
  public async importFromCsv(file: Express.Multer.File): Promise<CsvImportResult> {
    this.logger.log('Starting CSV import');
    const rows = this.parseCsvFile(file);
    this.logger.log(`Parsed ${rows.length} rows from CSV`);
    const results: CsvRowResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      const rowIndex = i + 1;
      const result = await this.processRow(rows[i], rowIndex);
      results.push(result);
      if (result.success) {
        successful++;
      } else if (result.skipped) {
        skipped++;
      } else {
        failed++;
      }
    }
    this.logger.log(
      `CSV import completed: ${successful} successful, ${failed} failed, ${skipped} skipped (duplicates), ${rows.length} total`,
    );
    return {
      totalRows: rows.length,
      successful,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Parst die CSV-Datei und gibt die Zeilen als Array zurück
   * Loggt dabei detaillierte Informationen zur CSV-Struktur
   */
  private parseCsvFile(file: Express.Multer.File): CsvRow[] {
    this.logger.debug(`--- CSV-Datei-Analyse ---`);
    this.logger.debug(`Dateiname: ${file.originalname}`);
    this.logger.debug(`MIME-Type: ${file.mimetype}`);
    this.logger.debug(`Dateigröße: ${file.size} Bytes`);
    const content = file.buffer.toString('utf-8');
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as CsvRow[];
    // Header-Spalten aus der ersten Zeile ermitteln
    if (rows.length > 0) {
      const detectedColumns = Object.keys(rows[0]);
      this.logger.debug(`Erkannte Spalten (${detectedColumns.length}): ${detectedColumns.join(', ')}`);
      const matched = detectedColumns.filter(col => EXPECTED_CSV_COLUMNS.includes(col));
      const unexpected = detectedColumns.filter(col => !EXPECTED_CSV_COLUMNS.includes(col));
      const missing = EXPECTED_CSV_COLUMNS.filter(col => !detectedColumns.includes(col));
      this.logger.debug(`Zugeordnete Spalten (${matched.length}): ${matched.join(', ')}`);
      if (unexpected.length > 0) {
        this.logger.debug(`Unbekannte Spalten (werden ignoriert) (${unexpected.length}): ${unexpected.join(', ')}`);
      }
      if (missing.length > 0) {
        this.logger.debug(`Fehlende Spalten (${missing.length}): ${missing.join(', ')}`);
      }
    } else {
      this.logger.debug('CSV enthält keine Datenzeilen (nur Header oder leer)');
    }
    this.logger.debug(`--- Ende CSV-Datei-Analyse ---`);
    return rows;
  }

  /**
   * Verarbeitet eine einzelne CSV-Zeile
   * Validiert, transformiert, prüft auf Duplikate und erstellt das Event
   */
  private async processRow(row: CsvRow, rowIndex: number): Promise<CsvRowResult> {
    this.logger.debug(`--- Zeile ${rowIndex} ---`);
    this.logger.debug(`  Titel:            "${row.Titel || ''}"`);
    this.logger.debug(`  Beschreibung:     "${(row.Beschreibung || '').substring(0, 80)}${(row.Beschreibung || '').length > 80 ? '...' : ''}"`);
    this.logger.debug(`  Startdatum:       "${row.Startdatum || ''}" | Enddatum: "${row.Enddatum || ''}"`);
    this.logger.debug(`  Startzeit:        "${row.Startzeit || ''}" | Endzeit: "${row.Endzeit || ''}"`);
    this.logger.debug(`  Veranstaltungsort:"${row.Veranstaltungsort || ''}"`);
    this.logger.debug(`  Kategorien:       "${row.Kategorien || ''}"`);
    this.logger.debug(`  Preis:            "${row.Preis || ''}" | Tickets: "${row.Tickets || ''}"`);
    this.logger.debug(`  E-Mail:           "${row['E-Mail'] || ''}" | Telefon: "${row.Telefon || ''}"`);
    this.logger.debug(`  Webseite:         "${row.Webseite || ''}" | Detail-URL: "${row['Detail-URL'] || ''}"`);
    this.logger.debug(`  Bild-URL:         "${row['Bild-URL'] || ''}" (wird ignoriert)`);
    this.logger.debug(`  Social Media:     "${row['Social Media'] || ''}" (wird ignoriert)`);
    const errors: CsvRowError[] = [];
    // 1. Validierung der Pflichtfelder
    const validationErrors = this.validateRow(row, rowIndex);
    if (validationErrors.length > 0) {
      this.logger.debug(`  Zeile ${rowIndex}: Validierung fehlgeschlagen mit ${validationErrors.length} Fehler(n)`);
      validationErrors.forEach(err => this.logger.debug(`    -> ${err.field}: ${err.message}`));
      return {
        rowIndex,
        success: false,
        errors: validationErrors,
      };
    }
    this.logger.debug(`  Zeile ${rowIndex}: Validierung OK`);
    // 2. dailyTimeSlots erstellen
    const dailyTimeSlots = this.buildDailyTimeSlots(row, rowIndex, errors);
    this.logger.debug(`  Zeile ${rowIndex}: ${dailyTimeSlots.length} DailyTimeSlot(s) erstellt: ${dailyTimeSlots.map(s => `${s.date} ${s.from || '?'}-${s.to || '?'}`).join(', ')}`);
    // 3. Duplikatsprüfung
    const dates = dailyTimeSlots.map(slot => slot.date);
    try {
      const duplicate = await this.eventsService.findByTitleAndDate(row.Titel, dates);
      if (duplicate) {
        this.logger.debug(`  Zeile ${rowIndex}: DUPLIKAT erkannt -> existierendes Event ID: ${duplicate.id}`);
        return {
          rowIndex,
          success: false,
          skipped: true,
          duplicateEventId: duplicate.id,
          errors: [
            {
              rowIndex,
              field: 'Titel',
              message: `Event mit Titel '${row.Titel}' und Datum '${dates.join(', ')}' existiert bereits (ID: ${duplicate.id})`,
              value: row.Titel,
            },
          ],
        };
      }
    } catch (error) {
      errors.push({
        rowIndex,
        message: `Fehler bei der Duplikatsprüfung: ${error.message}`,
      });
    }
    this.logger.debug(`  Zeile ${rowIndex}: Kein Duplikat gefunden`);
    // 4. Location auflösen
    let location = { address: row.Veranstaltungsort, latitude: 0, longitude: 0 };
    if (row.Veranstaltungsort) {
      try {
        location = await this.resolveLocation(row.Veranstaltungsort);
        this.logger.debug(`  Zeile ${rowIndex}: Location aufgelöst -> ${location.address} (${location.latitude}, ${location.longitude})`);
      } catch (error) {
        errors.push({
          rowIndex,
          field: 'Veranstaltungsort',
          message: `Location konnte nicht aufgelöst werden: ${row.Veranstaltungsort}. Verwende Adresse ohne Koordinaten.`,
          value: row.Veranstaltungsort,
        });
      }
    } else {
      errors.push({
        rowIndex,
        field: 'Veranstaltungsort',
        message: 'Veranstaltungsort fehlt',
      });
    }
    // 5. Kategorie mappen
    let categoryId = 'default';
    if (row.Kategorien) {
      try {
        categoryId = await this.mapCategoryToId(row.Kategorien);
        this.logger.debug(`  Zeile ${rowIndex}: Kategorie "${row.Kategorien}" -> ID: "${categoryId}"`);
      } catch (error) {
        errors.push({
          rowIndex,
          field: 'Kategorien',
          message: `Kategorie-Mapping fehlgeschlagen: ${error.message}. Verwende 'default'.`,
          value: row.Kategorien,
        });
      }
    }
    // 6. Preis parsen
    const priceData = this.parsePrice(row.Preis);
    this.logger.debug(`  Zeile ${rowIndex}: Preis "${row.Preis || ''}" -> price=${priceData.price}, priceString="${priceData.priceString || ''}"`);
    // 7. Website bestimmen
    const website = row.Webseite || row['Detail-URL'] || '';
    this.logger.debug(`  Zeile ${rowIndex}: Website -> "${website}"`);
    // 8. Event erstellen
    try {
      const createEventDto: CreateEventDto = {
        title: row.Titel,
        description: row.Beschreibung || '',
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        ticketsNeeded: this.parseTicketsNeeded(row.Tickets),
        price: priceData.price,
        priceString: priceData.priceString,
        categoryId,
        contactEmail: this.parseEmail(row['E-Mail']),
        contactPhone: row.Telefon || undefined,
        website: website || undefined,
        dailyTimeSlots,
      };
      this.logger.debug(`  Zeile ${rowIndex}: Event wird erstellt...`);
      const event = await this.eventsService.create(createEventDto);
      this.logger.debug(`  Zeile ${rowIndex}: Event erfolgreich erstellt -> ID: ${event.id}`);
      if (errors.length > 0) {
        this.logger.debug(`  Zeile ${rowIndex}: Erfolgreich mit ${errors.length} Warnung(en)`);
        return {
          rowIndex,
          success: true,
          eventId: event.id,
          errors,
        };
      }
      return {
        rowIndex,
        success: true,
        eventId: event.id,
        errors: [],
      };
    } catch (error) {
      this.logger.debug(`  Zeile ${rowIndex}: Event-Erstellung fehlgeschlagen: ${error.message}`);
      errors.push({
        rowIndex,
        message: `Event konnte nicht erstellt werden: ${error.message}`,
      });
      return {
        rowIndex,
        success: false,
        errors,
      };
    }
  }

  /**
   * Validiert die Pflichtfelder einer CSV-Zeile
   */
  private validateRow(row: CsvRow, rowIndex: number): CsvRowError[] {
    const errors: CsvRowError[] = [];
    if (!row.Titel || row.Titel.trim() === '') {
      errors.push({
        rowIndex,
        field: 'Titel',
        message: 'Titel ist ein Pflichtfeld und darf nicht leer sein',
        value: row.Titel,
      });
    }
    if (!row.Startdatum || row.Startdatum.trim() === '') {
      errors.push({
        rowIndex,
        field: 'Startdatum',
        message: 'Startdatum ist ein Pflichtfeld und darf nicht leer sein',
        value: row.Startdatum,
      });
    } else if (!this.isValidDate(row.Startdatum)) {
      errors.push({
        rowIndex,
        field: 'Startdatum',
        message: `Ungültiges Datumsformat: '${row.Startdatum}'. Erwartet: YYYY-MM-DD`,
        value: row.Startdatum,
      });
    }
    if (row.Enddatum && row.Enddatum.trim() !== '' && !this.isValidDate(row.Enddatum)) {
      errors.push({
        rowIndex,
        field: 'Enddatum',
        message: `Ungültiges Datumsformat: '${row.Enddatum}'. Erwartet: YYYY-MM-DD`,
        value: row.Enddatum,
      });
    }
    if (row.Startzeit && row.Startzeit.trim() !== '' && !this.isValidTime(row.Startzeit)) {
      errors.push({
        rowIndex,
        field: 'Startzeit',
        message: `Ungültiges Zeitformat: '${row.Startzeit}'. Erwartet: HH:mm`,
        value: row.Startzeit,
      });
    }
    if (row.Endzeit && row.Endzeit.trim() !== '' && !this.isValidTime(row.Endzeit)) {
      errors.push({
        rowIndex,
        field: 'Endzeit',
        message: `Ungültiges Zeitformat: '${row.Endzeit}'. Erwartet: HH:mm`,
        value: row.Endzeit,
      });
    }
    return errors;
  }

  /**
   * Erstellt dailyTimeSlots aus Startdatum, Enddatum, Startzeit und Endzeit
   */
  private buildDailyTimeSlots(
    row: CsvRow,
    rowIndex: number,
    errors: CsvRowError[],
  ): DailyTimeSlot[] {
    const startDate = row.Startdatum?.trim();
    const endDate = row.Enddatum?.trim() || startDate;
    const startTime = row.Startzeit?.trim() || undefined;
    const endTime = row.Endzeit?.trim() || undefined;
    if (!startDate) {
      return [];
    }
    const slots: DailyTimeSlot[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push({
        rowIndex,
        field: 'Startdatum/Enddatum',
        message: `Ungültige Daten: Start='${startDate}', Ende='${endDate}'`,
      });
      return [];
    }
    if (end < start) {
      errors.push({
        rowIndex,
        field: 'Enddatum',
        message: `Enddatum '${endDate}' liegt vor Startdatum '${startDate}'`,
      });
      return [];
    }
    for (
      let current = new Date(start);
      current <= end;
      current.setDate(current.getDate() + 1)
    ) {
      const dateString = current.toISOString().split('T')[0];
      const slot: DailyTimeSlot = { date: dateString };
      if (startTime) {
        slot.from = startTime;
      }
      if (endTime) {
        slot.to = endTime;
      }
      slots.push(slot);
    }
    return slots;
  }

  /**
   * Löst eine Adresse über die HERE API auf und gibt Location-Daten zurück
   */
  public async resolveLocation(
    address: string,
  ): Promise<{ address: string; latitude: number; longitude: number }> {
    this.logger.debug(`Resolving location for: ${address}`);
    const results = await this.locationService.searchLocations(address);
    if (!results || results.length === 0) {
      throw new Error(`Keine Location-Ergebnisse für: ${address}`);
    }
    const firstResult = results[0];
    return {
      address: firstResult.address?.label || address,
      latitude: firstResult.position?.lat || 0,
      longitude: firstResult.position?.lng || 0,
    };
  }

  /**
   * Mappt einen Kategorie-Namen zu einer Kategorie-ID
   * Sucht case-insensitive und mit Teilstring-Matching
   */
  public async mapCategoryToId(categoryName: string): Promise<string> {
    if (!categoryName || categoryName.trim() === '') {
      return 'default';
    }
    const categories = await this.eventCategoriesService.findAll();
    const normalizedInput = categoryName.toLowerCase().trim();
    // Exakter Treffer auf Name
    const exactMatch = categories.find(
      (cat: EventCategory) => cat.name.toLowerCase().trim() === normalizedInput,
    );
    if (exactMatch) {
      return exactMatch.id;
    }
    // Exakter Treffer auf ID
    const idMatch = categories.find(
      (cat: EventCategory) => cat.id.toLowerCase() === normalizedInput,
    );
    if (idMatch) {
      return idMatch.id;
    }
    // Teilstring-Matching: Priorisiere nach Position im Input-String (früherer Match = besser)
    // z.B. "Kindertheater" soll "Kinder" matchen (Position 0), nicht "Theater" (Position 6)
    const matchesWithPosition = categories
      .filter((cat: EventCategory) => {
        const catName = cat.name.toLowerCase().trim();
        return catName.length > 0 && normalizedInput.includes(catName);
      })
      .map((cat: EventCategory) => ({
        category: cat,
        position: normalizedInput.indexOf(cat.name.toLowerCase().trim()),
      }))
      .sort((a, b) => a.position - b.position);
    if (matchesWithPosition.length > 0) {
      return matchesWithPosition[0].category.id;
    }
    this.logger.warn(
      `Kategorie '${categoryName}' nicht gefunden, verwende 'default'`,
    );
    return 'default';
  }

  /**
   * Parst den Preis-String aus der CSV
   */
  private parsePrice(priceString: string | undefined): {
    price: number | null;
    priceString?: string;
  } {
    if (!priceString || priceString.trim() === '') {
      return { price: null };
    }
    const trimmed = priceString.trim().toLowerCase();
    // Kostenlos
    if (
      trimmed === 'kostenlos' ||
      trimmed === 'frei' ||
      trimmed === 'eintritt frei' ||
      trimmed === 'free'
    ) {
      return { price: 0, priceString: priceString.trim() };
    }
    // Versuche Zahl zu extrahieren (z.B. "ab 10,00€", "15€", "10.50 EUR")
    const numberMatch = trimmed.match(/(\d+[.,]?\d*)/);
    if (numberMatch) {
      const numericValue = parseFloat(numberMatch[1].replace(',', '.'));
      return {
        price: numericValue,
        priceString: priceString.trim(),
      };
    }
    // Kann nicht geparst werden - als String behalten
    return { price: null, priceString: priceString.trim() };
  }

  /**
   * Prüft, ob Tickets benötigt werden
   */
  private parseTicketsNeeded(tickets: string | undefined): boolean {
    if (!tickets || tickets.trim() === '') {
      return false;
    }
    const trimmed = tickets.trim().toLowerCase();
    return trimmed === 'ja' || trimmed === 'yes' || trimmed === 'true' || trimmed === '1';
  }

  /**
   * Validiert und extrahiert eine E-Mail-Adresse
   */
  private parseEmail(email: string | undefined): string | undefined {
    if (!email || email.trim() === '') {
      return undefined;
    }
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) {
      return trimmed;
    }
    return undefined;
  }

  /**
   * Prüft, ob ein Datum-String im Format YYYY-MM-DD gültig ist
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString.trim())) {
      return false;
    }
    const date = new Date(dateString.trim());
    return !isNaN(date.getTime());
  }

  /**
   * Prüft, ob ein Zeit-String im Format HH:mm gültig ist
   */
  private isValidTime(timeString: string): boolean {
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
    return regex.test(timeString.trim());
  }
}
