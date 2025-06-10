import { Test, TestingModule } from '@nestjs/testing';
import { ScraperService } from './scraper.service';
import { EventFinderScraper } from './eventfinder-scraper';
import { CurtScraper } from './curt-scraper';
import { RausgegangenScraper } from './rausgegangen-scraper';
import { ParksScraper } from './parks-scraper';
import { EventbriteScraper } from './eventbrite-scraper';
import { ScraperType } from './base-scraper.interface';
import { Event } from '../../interfaces/event.interface';

describe('ScraperService', () => {
  let service: ScraperService;
  let eventFinderScraper: EventFinderScraper;
  let curtScraper: CurtScraper;
  let rausgegangenScraper: RausgegangenScraper;
  let parksScraper: ParksScraper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperService,
        {
          provide: EventFinderScraper,
          useValue: {
            scrapeEventsForDate: jest.fn(),
            scrapeEventsForDateRange: jest.fn(),
            scrapeEventsFromUrl: jest.fn(),
          },
        },
        {
          provide: CurtScraper,
          useValue: {
            scrapeEventsForDate: jest.fn(),
            scrapeEventsForDateRange: jest.fn(),
            scrapeEventsFromUrl: jest.fn(),
          },
        },
        {
          provide: RausgegangenScraper,
          useValue: {
            scrapeEventsForDate: jest.fn(),
            scrapeEventsForDateRange: jest.fn(),
            scrapeEventsFromUrl: jest.fn(),
          },
        },
        {
          provide: ParksScraper,
          useValue: {
            scrapeEventsForDate: jest.fn(),
            scrapeEventsForDateRange: jest.fn(),
            scrapeEventsFromUrl: jest.fn(),
          },
        },
        {
          provide: EventbriteScraper,
          useValue: {
            scrapeEventsForDate: jest.fn(),
            scrapeEventsForDateRange: jest.fn(),
            scrapeEventsFromUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScraperService>(ScraperService);
    eventFinderScraper = module.get<EventFinderScraper>(EventFinderScraper);
    curtScraper = module.get<CurtScraper>(CurtScraper);
    rausgegangenScraper = module.get<RausgegangenScraper>(RausgegangenScraper);
    parksScraper = module.get<ParksScraper>(ParksScraper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveScrapers', () => {
    it('should return all active scrapers', () => {
      const activeScrapers = service.getActiveScrapers();
      expect(activeScrapers).toContain(ScraperType.EVENTFINDER);
      expect(activeScrapers).toContain(ScraperType.CURT);
      expect(activeScrapers).toContain(ScraperType.RAUSGEGANGEN);
      expect(activeScrapers).toContain(ScraperType.PARKS);
    });
  });

  describe('scrapeEventsForDate', () => {
    it('should scrape events from all scrapers for a date', async () => {
      const date = new Date('2024-05-01');
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'Test Address',
            latitude: 0,
            longitude: 0,
          },
          dailyTimeSlots: [
            {
              date: '2024-05-01',
              from: '18:00',
              to: '22:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (eventFinderScraper.scrapeEventsForDate as jest.Mock).mockResolvedValue({ events: mockEvents });
      (curtScraper.scrapeEventsForDate as jest.Mock).mockResolvedValue({ events: mockEvents });
      (rausgegangenScraper.scrapeEventsForDate as jest.Mock).mockResolvedValue({ events: mockEvents });
      (parksScraper.scrapeEventsForDate as jest.Mock).mockResolvedValue({ events: mockEvents });

      const result = await service.scrapeEventsForDate(date);

      expect(result).toHaveLength(4); // 4 Scraper * 1 Event
      expect(eventFinderScraper.scrapeEventsForDate).toHaveBeenCalledWith(date);
      expect(curtScraper.scrapeEventsForDate).toHaveBeenCalledWith(date);
      expect(rausgegangenScraper.scrapeEventsForDate).toHaveBeenCalledWith(date);
      expect(parksScraper.scrapeEventsForDate).toHaveBeenCalledWith(date);
    });
  });

  describe('scrapeEventsForDateRange', () => {
    it('should scrape events from all scrapers for a date range', async () => {
      const startDate = new Date('2024-05-01');
      const endDate = new Date('2024-05-31');
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'Test Address',
            latitude: 0,
            longitude: 0,
          },
          dailyTimeSlots: [
            {
              date: '2024-05-01',
              from: '18:00',
              to: '22:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (eventFinderScraper.scrapeEventsForDateRange as jest.Mock).mockResolvedValue({ events: mockEvents });
      (curtScraper.scrapeEventsForDateRange as jest.Mock).mockResolvedValue({ events: mockEvents });
      (rausgegangenScraper.scrapeEventsForDateRange as jest.Mock).mockResolvedValue({ events: mockEvents });
      (parksScraper.scrapeEventsForDateRange as jest.Mock).mockResolvedValue({ events: mockEvents });

      const result = await service.scrapeEventsForDateRange(startDate, endDate);

      expect(result).toHaveLength(4); // 4 Scraper * 1 Event
      expect(eventFinderScraper.scrapeEventsForDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(curtScraper.scrapeEventsForDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(rausgegangenScraper.scrapeEventsForDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(parksScraper.scrapeEventsForDateRange).toHaveBeenCalledWith(startDate, endDate);
    });
  });

  describe('scrapeEventsFromUrl', () => {
    it('should scrape events from a specific scraper for a URL', async () => {
      const url = 'https://www.parks-nuernberg.de/kalender/';
      const mockEvents: Event[] = [
        {
          id: '1',
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'Test Address',
            latitude: 0,
            longitude: 0,
          },
          dailyTimeSlots: [
            {
              date: '2024-05-01',
              from: '18:00',
              to: '22:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (parksScraper.scrapeEventsFromUrl as jest.Mock).mockResolvedValue({ events: mockEvents, hasMorePages: false });

      const result = await service.scrapeEventsFromUrl(ScraperType.PARKS, url);

      expect(result).toEqual(mockEvents);
      expect(parksScraper.scrapeEventsFromUrl).toHaveBeenCalledWith(url);
    });

    it('should throw error for non-existent scraper type', async () => {
      const url = 'https://example.com';
      await expect(service.scrapeEventsFromUrl('NON_EXISTENT' as ScraperType, url)).rejects.toThrow(
        'No active scraper found for type: NON_EXISTENT',
      );
    });
  });
}); 