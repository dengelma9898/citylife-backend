import { Test, TestingModule } from '@nestjs/testing';
import { HybridExtractorService } from './hybrid-extractor.service';
import { MistralExtractorService } from './mistral-extractor.service';
import { EventNormalizerService } from './event-normalizer.service';
import { ScraperService } from '../scraping/scraper.service';
import { PuppeteerManager } from '../scraping/puppeteer.config';
import { ScraperResult } from '../scraping/base-scraper.interface';
import { Event } from '../../interfaces/event.interface';

jest.mock('../scraping/puppeteer.config');

describe('HybridExtractorService', () => {
  let service: HybridExtractorService;
  let mistralExtractor: jest.Mocked<MistralExtractorService>;
  let eventNormalizer: jest.Mocked<EventNormalizerService>;
  let scraperService: jest.Mocked<ScraperService>;

  beforeEach(async () => {
    const mockMistralExtractor = {
      extractEvents: jest.fn(),
    };

    const mockEventNormalizer = {
      normalize: jest.fn(),
    };

    const mockScraperService = {
      scrapeEventsFromUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridExtractorService,
        {
          provide: MistralExtractorService,
          useValue: mockMistralExtractor,
        },
        {
          provide: EventNormalizerService,
          useValue: mockEventNormalizer,
        },
        {
          provide: ScraperService,
          useValue: mockScraperService,
        },
      ],
    }).compile();

    service = module.get<HybridExtractorService>(HybridExtractorService);
    mistralExtractor = module.get(MistralExtractorService);
    eventNormalizer = module.get(EventNormalizerService);
    scraperService = module.get(ScraperService);

    // Mock PuppeteerManager
    (PuppeteerManager.getInstance as jest.Mock).mockReturnValue({
      getPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body>Test</body></html>'),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      getConfig: jest.fn().mockReturnValue({ timeout: 60000 }),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrapeEventsFromUrl', () => {
    it('should use Mistral extraction successfully', async () => {
      const mockEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test',
          location: { address: 'Test', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'konzert',
        },
      ];

      const normalizedEvents: Event[] = [
        {
          id: 'test-id',
          title: 'Test Event',
          description: 'Test',
          location: { address: 'Test', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'konzert',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mistralExtractor.extractEvents.mockResolvedValue(mockEvents);
      eventNormalizer.normalize.mockResolvedValue(normalizedEvents);

      const result = await service.scrapeEventsFromUrl('https://example.com/events');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Test Event');
      expect(mistralExtractor.extractEvents).toHaveBeenCalled();
      expect(scraperService.scrapeEventsFromUrl).not.toHaveBeenCalled();
    });

    it('should fallback to Puppeteer on Mistral failure', async () => {
      const fallbackEvents: Event[] = [
        {
          id: 'fallback-id',
          title: 'Fallback Event',
          description: 'Fallback',
          location: { address: 'Fallback', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mistralExtractor.extractEvents.mockRejectedValue(new Error('Mistral failed'));
      scraperService.scrapeEventsFromUrl.mockResolvedValue(fallbackEvents);

      const result = await service.scrapeEventsFromUrl('https://eventfinder.de/nuernberg');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Fallback Event');
      expect(scraperService.scrapeEventsFromUrl).toHaveBeenCalled();
    });

    it('should fallback to Puppeteer on empty results', async () => {
      mistralExtractor.extractEvents.mockResolvedValue([]);
      scraperService.scrapeEventsFromUrl.mockResolvedValue([]);

      const result = await service.scrapeEventsFromUrl('https://eventfinder.de/nuernberg');

      expect(result.events).toHaveLength(0);
      expect(scraperService.scrapeEventsFromUrl).toHaveBeenCalled();
    });
  });
});
