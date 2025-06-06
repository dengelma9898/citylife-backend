import { Test, TestingModule } from '@nestjs/testing';
import { ParksScraper } from './parks-scraper';
import { Event } from '../../interfaces/event.interface';
import { PuppeteerManager } from './puppeteer.config';
import { Page } from 'puppeteer';

jest.mock('./puppeteer.config');

describe('ParksScraper', () => {
  let scraper: ParksScraper;
  let mockPage: Partial<Page>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParksScraper],
    }).compile();

    scraper = module.get<ParksScraper>(ParksScraper);

    mockPage = {
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    };

    (PuppeteerManager.getInstance as jest.Mock).mockReturnValue({
      getPage: jest.fn().mockResolvedValue(mockPage),
      getConfig: jest.fn().mockReturnValue({ timeout: 30000 }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scraper).toBeDefined();
  });

  describe('scrapeEventsFromUrl', () => {
    it('should scrape events successfully with German date format', async () => {
      const mockEvents = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-06-11',
              from: '18:00',
              to: '19:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 1 event elements');
        return mockEvents;
      });

      const result = await scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Test Event');
      expect(result.events[0].dailyTimeSlots[0].date).toBe('2024-06-11');
    });

    it('should filter events by date range', async () => {
      const mockEvents = [
        {
          title: 'Event 1',
          description: 'Description 1',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-06-11',
              from: '18:00',
              to: '19:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: 'Event 2',
          description: 'Description 2',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-06-12',
              from: '20:00',
              to: '22:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 2 event elements');
        return mockEvents;
      });

      const result = await scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Event 1');
      expect(result.events[0].dailyTimeSlots[0].date).toBe('2024-06-11');
    });

    it('should handle empty events', async () => {
      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 0 event elements');
        return [];
      });

      const result = await scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
      });

      expect(result.events).toHaveLength(0);
    });

    it('should handle invalid date format', async () => {
      const mockEvents = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 1 event elements');
        console.log('Konnte Datum nicht parsen: Ungültiges Datum');
        return mockEvents;
      });

      const result = await scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
      });

      expect(result.events).toHaveLength(0);
    });

    it('should handle page load error', async () => {
      (mockPage.goto as jest.Mock).mockRejectedValue(new Error('Page load failed'));

      await expect(
        scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
          startDate: new Date('2024-06-11'),
          endDate: new Date('2024-06-11'),
        }),
      ).rejects.toThrow('Page load failed');
    });

    it('should convert various German date formats correctly', async () => {
      const mockEvents = [
        {
          title: 'Event 1',
          description: 'Description 1',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-06-11', // 11. Juni 2024
              from: '18:00',
              to: '19:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: 'Event 2',
          description: 'Description 2',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-12-24', // 24. Dezember 2024
              from: '20:00',
              to: '22:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 2 event elements');
        return mockEvents;
      });

      const result = await scraper.scrapeEventsFromUrl('https://www.parks-nuernberg.de/kalender/', {
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].dailyTimeSlots[0].date).toBe('2024-06-11');
    });
  });

  describe('scrapeEvents', () => {
    it('should scrape events with options', async () => {
      const mockEvents = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: {
            address: 'PARKS Nürnberg',
            latitude: 49.453872,
            longitude: 11.077298,
          },
          dailyTimeSlots: [
            {
              date: '2024-06-11',
              from: '18:00',
              to: '19:00',
            },
          ],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log('Found 1 event elements');
        return mockEvents;
      });

      const result = await scraper.scrapeEvents({
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
        maxResults: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Event');
      expect(result[0].dailyTimeSlots[0].date).toBe('2024-06-11');
    });

    it('should respect maxResults option', async () => {
      const mockEvents = Array.from({ length: 20 }, (_, i) => ({
        title: `Event ${i + 1}`,
        description: `Description ${i + 1}`,
        location: {
          address: 'PARKS Nürnberg',
          latitude: 49.453872,
          longitude: 11.077298,
        },
        dailyTimeSlots: [
          {
            date: '2024-06-11',
            from: '18:00',
            to: '19:00',
          },
        ],
        categoryId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      (mockPage.evaluate as jest.Mock).mockImplementation(() => {
        console.log(`Found ${mockEvents.length} event elements`);
        return mockEvents;
      });

      const result = await scraper.scrapeEvents({
        startDate: new Date('2024-06-11'),
        endDate: new Date('2024-06-11'),
        maxResults: 10,
      });

      expect(result).toHaveLength(10);
    });
  });
}); 