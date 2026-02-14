import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportService } from './csv-import.service';
import { EventsService } from '../../events.service';
import { LocationService } from '../../../location/services/location.service';
import { EventCategoriesService } from '../../../event-categories/services/event-categories.service';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let eventsService: jest.Mocked<EventsService>;
  let locationService: jest.Mocked<LocationService>;
  let eventCategoriesService: jest.Mocked<EventCategoriesService>;

  const mockCategories = [
    {
      id: 'konzert',
      name: 'Konzert',
      description: 'Konzerte',
      colorCode: '#FF0000',
      iconName: 'music',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'theater',
      name: 'Theater',
      description: 'Theateraufführungen',
      colorCode: '#00FF00',
      iconName: 'theater',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'kinder',
      name: 'Kinder',
      description: 'Kinder-Events',
      colorCode: '#0000FF',
      iconName: 'child',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'default',
      name: 'Sonstiges',
      description: 'Sonstige Events',
      colorCode: '#999999',
      iconName: 'default',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const mockLocationResult = [
    {
      title: 'Test Location',
      id: 'loc-1',
      resultType: 'houseNumber',
      address: {
        label: 'Klaragasse 8, 90402 Nürnberg',
        countryCode: 'DEU',
        countryName: 'Deutschland',
        state: 'Bayern',
        county: 'Nürnberg',
        city: 'Nürnberg',
        district: 'Altstadt',
        street: 'Klaragasse',
        postalCode: '90402',
      },
      position: {
        lat: 49.4521,
        lng: 11.0767,
      },
    },
  ];

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date('2026-01-15T12:00:00Z') });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        {
          provide: EventsService,
          useValue: {
            create: jest.fn(),
            findByTitleAndDate: jest.fn(),
          },
        },
        {
          provide: LocationService,
          useValue: {
            searchLocations: jest.fn(),
          },
        },
        {
          provide: EventCategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CsvImportService>(CsvImportService);
    eventsService = module.get(EventsService) as jest.Mocked<EventsService>;
    locationService = module.get(LocationService) as jest.Mocked<LocationService>;
    eventCategoriesService = module.get(
      EventCategoriesService,
    ) as jest.Mocked<EventCategoriesService>;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('importFromCsv', () => {
    const createCsvFile = (content: string): Express.Multer.File => ({
      buffer: Buffer.from(content, 'utf-8'),
      originalname: 'events.csv',
      mimetype: 'text/csv',
      fieldname: 'file',
      encoding: '7bit',
      size: content.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should successfully import a single valid CSV row', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
ROMES,ROMES live im Club Stereo.,2026-02-09,2026-02-09,19:45,,CLUB STEREO Klaragasse 8 90402 Nürnberg,Konzert,,,,,,,,https://www.curt.de/`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockResolvedValue({
        id: 'event-1',
        title: 'ROMES',
        description: 'ROMES live im Club Stereo.',
        location: { address: 'Klaragasse 8, 90402 Nürnberg', latitude: 49.4521, longitude: 11.0767 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-02-09', from: '19:45' }],
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].eventId).toBe('event-1');
    });

    it('should handle multiple CSV rows with mixed results', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event 1,Beschreibung 1,2026-02-09,2026-02-09,20:00,,Location 1,Konzert,,,,,,,,
,Fehlende Titel,2026-02-09,2026-02-09,20:00,,Location 2,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockResolvedValue({
        id: 'event-1',
        title: 'Event 1',
        description: 'Beschreibung 1',
        location: { address: 'Location 1', latitude: 49.4521, longitude: 11.0767 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-02-09', from: '20:00' }],
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].errors[0].field).toBe('Titel');
    });

    it('should skip duplicates', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Existing Event,Beschreibung,2026-02-09,2026-02-09,20:00,,Location 1,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue({
        id: 'existing-event-1',
        title: 'Existing Event',
        description: 'Existing description',
        location: { address: 'Existing Location', latitude: 49.0, longitude: 11.0 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-02-09', from: '20:00' }],
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.results[0].skipped).toBe(true);
      expect(result.results[0].duplicateEventId).toBe('existing-event-1');
      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('should handle empty CSV', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should continue processing after errors in individual rows', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
,Missing Title,invalid-date,,,,No Location,,,,,,,,,
Valid Event,Description,2026-02-10,2026-02-10,21:00,,Some Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockResolvedValue({
        id: 'event-2',
        title: 'Valid Event',
        description: 'Description',
        location: { address: 'Some Location', latitude: 49.4521, longitude: 11.0767 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-02-10', from: '21:00' }],
        createdAt: '2026-02-10T10:00:00Z',
        updatedAt: '2026-02-10T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].eventId).toBe('event-2');
    });

    it('should handle location resolution failure gracefully', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,2026-02-09,20:00,,Unknown Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue([]);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockResolvedValue({
        id: 'event-3',
        title: 'Event',
        description: 'Beschreibung',
        location: { address: 'Unknown Location', latitude: 0, longitude: 0 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-02-09', from: '20:00' }],
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.totalRows).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].errors.length).toBeGreaterThan(0);
      expect(result.results[0].errors[0].field).toBe('Veranstaltungsort');
    });
  });

  describe('resolveLocation', () => {
    it('should resolve location from HERE API', async () => {
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      const result = await service.resolveLocation('Klaragasse 8, 90402 Nürnberg');
      expect(result.address).toBe('Klaragasse 8, 90402 Nürnberg');
      expect(result.latitude).toBe(49.4521);
      expect(result.longitude).toBe(11.0767);
    });

    it('should throw error when no results found', async () => {
      locationService.searchLocations.mockResolvedValue([]);
      await expect(service.resolveLocation('Nonexistent Address')).rejects.toThrow(
        'Keine Location-Ergebnisse',
      );
    });
  });

  describe('mapCategoryToId', () => {
    beforeEach(() => {
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
    });

    it('should match exact category name (case-insensitive)', async () => {
      const result = await service.mapCategoryToId('Konzert');
      expect(result).toBe('konzert');
    });

    it('should match category name case-insensitively', async () => {
      const result = await service.mapCategoryToId('THEATER');
      expect(result).toBe('theater');
    });

    it('should match by ID', async () => {
      const result = await service.mapCategoryToId('kinder');
      expect(result).toBe('kinder');
    });

    it('should match by partial string (input contains category name)', async () => {
      const result = await service.mapCategoryToId('Kindertheater');
      expect(result).toBe('kinder');
    });

    it('should return default for unknown categories', async () => {
      const result = await service.mapCategoryToId('Unbekannte Kategorie');
      expect(result).toBe('default');
    });

    it('should return default for empty category', async () => {
      const result = await service.mapCategoryToId('');
      expect(result).toBe('default');
    });
  });

  describe('validation', () => {
    const createCsvFile = (content: string): Express.Multer.File => ({
      buffer: Buffer.from(content, 'utf-8'),
      originalname: 'events.csv',
      mimetype: 'text/csv',
      fieldname: 'file',
      encoding: '7bit',
      size: content.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should report error for missing title', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
,Beschreibung,2026-02-09,2026-02-09,20:00,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errors).toContainEqual(
        expect.objectContaining({ field: 'Titel' }),
      );
    });

    it('should report error for missing start date', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,,,20:00,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errors).toContainEqual(
        expect.objectContaining({ field: 'Startdatum' }),
      );
    });

    it('should report error for invalid date format', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,09.02.2026,,20:00,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errors).toContainEqual(
        expect.objectContaining({
          field: 'Startdatum',
          message: expect.stringContaining('Ungültiges Datumsformat'),
        }),
      );
    });

    it('should report error for invalid time format', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,,25:99,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      const timeError = result.results[0].errors.find(e => e.field === 'Startzeit');
      expect(timeError).toBeDefined();
      expect(timeError.message).toContain('Ungültiges Zeitformat');
    });

    it('should reject events with start date in the past', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Past Event,Beschreibung,2026-01-14,2026-01-14,20:00,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errors).toContainEqual(
        expect.objectContaining({
          field: 'Startdatum',
          message: expect.stringContaining('Vergangenheit'),
        }),
      );
      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('should reject events with start date today', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Today Event,Beschreibung,2026-01-15,2026-01-15,20:00,,Location,Konzert,,,,,,,,`;
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].errors).toContainEqual(
        expect.objectContaining({
          field: 'Startdatum',
          message: expect.stringContaining('heute'),
        }),
      );
      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('should accept events with start date tomorrow or later', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Future Event,Beschreibung,2026-01-16,2026-01-16,20:00,,Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockResolvedValue({
        id: 'future-event-1',
        title: 'Future Event',
        description: 'Beschreibung',
        location: { address: 'Location', latitude: 49.4521, longitude: 11.0767 },
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: '2026-01-16', from: '20:00' }],
        createdAt: '2026-01-16T10:00:00Z',
        updatedAt: '2026-01-16T10:00:00Z',
      });
      const result = await service.importFromCsv(createCsvFile(csvContent));
      expect(result.results[0].success).toBe(true);
      expect(eventsService.create).toHaveBeenCalled();
    });
  });

  describe('price parsing', () => {
    const createCsvFile = (content: string): Express.Multer.File => ({
      buffer: Buffer.from(content, 'utf-8'),
      originalname: 'events.csv',
      mimetype: 'text/csv',
      fieldname: 'file',
      encoding: '7bit',
      size: content.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should parse "Kostenlos" as price 0', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,2026-02-09,20:00,,Location,Konzert,Kostenlos,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockImplementation(async (dto) => ({
        id: 'event-price-1',
        title: dto.title,
        description: dto.description,
        location: { address: dto.address, latitude: dto.latitude, longitude: dto.longitude },
        categoryId: dto.categoryId,
        dailyTimeSlots: dto.dailyTimeSlots,
        price: dto.price,
        priceString: dto.priceString,
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      }));
      await service.importFromCsv(createCsvFile(csvContent));
      expect(eventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 0,
          priceString: 'Kostenlos',
        }),
      );
    });

    it('should parse empty price as null', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,2026-02-09,20:00,,Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockImplementation(async (dto) => ({
        id: 'event-price-2',
        title: dto.title,
        description: dto.description,
        location: { address: dto.address, latitude: dto.latitude, longitude: dto.longitude },
        categoryId: dto.categoryId,
        dailyTimeSlots: dto.dailyTimeSlots,
        price: dto.price,
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      }));
      await service.importFromCsv(createCsvFile(csvContent));
      expect(eventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: null,
        }),
      );
    });
  });

  describe('dailyTimeSlots generation', () => {
    const createCsvFile = (content: string): Express.Multer.File => ({
      buffer: Buffer.from(content, 'utf-8'),
      originalname: 'events.csv',
      mimetype: 'text/csv',
      fieldname: 'file',
      encoding: '7bit',
      size: content.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    });

    it('should create single slot when start equals end date', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,2026-02-09,19:00,21:00,Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockImplementation(async (dto) => ({
        id: 'event-ts-1',
        title: dto.title,
        description: dto.description,
        location: { address: dto.address, latitude: dto.latitude, longitude: dto.longitude },
        categoryId: dto.categoryId,
        dailyTimeSlots: dto.dailyTimeSlots,
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      }));
      await service.importFromCsv(createCsvFile(csvContent));
      expect(eventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyTimeSlots: [{ date: '2026-02-09', from: '19:00', to: '21:00' }],
        }),
      );
    });

    it('should create multiple slots for date range', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,2026-02-11,10:00,,Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockImplementation(async (dto) => ({
        id: 'event-ts-2',
        title: dto.title,
        description: dto.description,
        location: { address: dto.address, latitude: dto.latitude, longitude: dto.longitude },
        categoryId: dto.categoryId,
        dailyTimeSlots: dto.dailyTimeSlots,
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      }));
      await service.importFromCsv(createCsvFile(csvContent));
      expect(eventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyTimeSlots: [
            { date: '2026-02-09', from: '10:00' },
            { date: '2026-02-10', from: '10:00' },
            { date: '2026-02-11', from: '10:00' },
          ],
        }),
      );
    });

    it('should use startDate as endDate when endDate is missing', async () => {
      const csvContent = `Titel,Beschreibung,Startdatum,Enddatum,Startzeit,Endzeit,Veranstaltungsort,Kategorien,Preis,Tickets,E-Mail,Telefon,Webseite,Social Media,Bild-URL,Detail-URL
Event,Beschreibung,2026-02-09,,19:45,,Location,Konzert,,,,,,,,`;
      eventsService.findByTitleAndDate.mockResolvedValue(null);
      locationService.searchLocations.mockResolvedValue(mockLocationResult);
      eventCategoriesService.findAll.mockResolvedValue(mockCategories);
      eventsService.create.mockImplementation(async (dto) => ({
        id: 'event-ts-3',
        title: dto.title,
        description: dto.description,
        location: { address: dto.address, latitude: dto.latitude, longitude: dto.longitude },
        categoryId: dto.categoryId,
        dailyTimeSlots: dto.dailyTimeSlots,
        createdAt: '2026-02-09T10:00:00Z',
        updatedAt: '2026-02-09T10:00:00Z',
      }));
      await service.importFromCsv(createCsvFile(csvContent));
      expect(eventsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dailyTimeSlots: [{ date: '2026-02-09', from: '19:45' }],
        }),
      );
    });
  });
});
