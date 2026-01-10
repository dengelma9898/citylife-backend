import { Test, TestingModule } from '@nestjs/testing';
import { HybridExtractorService } from './hybrid-extractor.service';
import { MistralExtractorService } from './mistral-extractor.service';
import { EventNormalizerService } from './event-normalizer.service';
import { ScraperService } from '../scraping/scraper.service';
import { PuppeteerManager } from '../scraping/puppeteer.config';
import { Event } from '../../interfaces/event.interface';

jest.mock('../scraping/puppeteer.config');

describe('HybridExtractorService Integration', () => {
  let service: HybridExtractorService;
  let mistralExtractor: MistralExtractorService;
  let eventNormalizer: EventNormalizerService;
  let scraperService: ScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybridExtractorService,
        MistralExtractorService,
        EventNormalizerService,
        ScraperService,
      ],
    }).compile();

    service = module.get<HybridExtractorService>(HybridExtractorService);
    mistralExtractor = module.get<MistralExtractorService>(MistralExtractorService);
    eventNormalizer = module.get<EventNormalizerService>(EventNormalizerService);
    scraperService = module.get<ScraperService>(ScraperService);

    // Mock PuppeteerManager
    (PuppeteerManager.getInstance as jest.Mock).mockReturnValue({
      getPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue(undefined),
        content: jest.fn().mockResolvedValue('<html><body><main><div class="event">Test Event</div></main></body></html>'),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      getConfig: jest.fn().mockReturnValue({ timeout: 60000 }),
    });
  });

  describe('End-to-End Scraping Flow', () => {
    it('should complete full flow: URL → HTML → Mistral → Normalization → Events', async () => {
      // Mock Mistral response
      jest.spyOn(mistralExtractor, 'extractEvents').mockResolvedValue([
        {
          title: 'Integration Test Event',
          description: 'Test Description',
          location: { address: 'Test Address 123', latitude: 49.45, longitude: 11.08 },
          dailyTimeSlots: [{ date: '2026-01-15', from: '19:00', to: '22:00' }],
          categoryId: 'konzert',
          price: 15,
          priceString: '15,00€',
        },
      ]);

      const result = await service.scrapeEventsFromUrl('https://example.com/events');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Integration Test Event');
      expect(result.events[0].id).toBeDefined();
      expect(result.events[0].createdAt).toBeDefined();
      expect(result.events[0].updatedAt).toBeDefined();
      expect(result.events[0].dailyTimeSlots).toHaveLength(1);
      expect(result.events[0].dailyTimeSlots[0].date).toBe('2026-01-15');
    });

    it('should handle fallback scenario: Mistral fails → Puppeteer succeeds', async () => {
      // Mock Mistral failure
      jest.spyOn(mistralExtractor, 'extractEvents').mockRejectedValue(new Error('API Error'));

      // Mock Puppeteer success
      const fallbackEvents: Event[] = [
        {
          id: 'fallback-id',
          title: 'Fallback Event',
          description: 'Fallback Description',
          location: { address: 'Fallback Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-15' }],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      jest.spyOn(scraperService, 'scrapeEventsFromUrl').mockResolvedValue(fallbackEvents);

      const result = await service.scrapeEventsFromUrl('https://eventfinder.de/nuernberg');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Fallback Event');
      expect(scraperService.scrapeEventsFromUrl).toHaveBeenCalled();
    });

    it('should handle empty Mistral results → fallback to Puppeteer', async () => {
      // Mock empty Mistral response
      jest.spyOn(mistralExtractor, 'extractEvents').mockResolvedValue([]);

      // Mock Puppeteer success
      const fallbackEvents: Event[] = [
        {
          id: 'fallback-id',
          title: 'Puppeteer Event',
          description: 'Puppeteer Description',
          location: { address: 'Puppeteer Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-15' }],
          categoryId: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      jest.spyOn(scraperService, 'scrapeEventsFromUrl').mockResolvedValue(fallbackEvents);

      const result = await service.scrapeEventsFromUrl('https://curt.de/termine/84');

      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe('Puppeteer Event');
    });
  });
});
