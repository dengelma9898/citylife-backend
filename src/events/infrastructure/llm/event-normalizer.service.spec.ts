import { Test, TestingModule } from '@nestjs/testing';
import { EventNormalizerService } from './event-normalizer.service';
import { Event } from '../../interfaces/event.interface';

describe('EventNormalizerService', () => {
  let service: EventNormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventNormalizerService],
    }).compile();

    service = module.get<EventNormalizerService>(EventNormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalize', () => {
    it('should complete event with id and timestamps', async () => {
      const partialEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: { address: 'Test Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10', from: '18:00', to: '20:00' }],
          categoryId: 'konzert',
        },
      ];

      const result = await service.normalize(partialEvents);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();
      expect(result[0].updatedAt).toBeDefined();
      expect(result[0].title).toBe('Test Event');
    });

    it('should handle missing location', async () => {
      const partialEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test Description',
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'konzert',
        },
      ];

      const result = await service.normalize(partialEvents);

      expect(result[0].location).toEqual({ address: '', latitude: 0, longitude: 0 });
    });

    it('should validate and fix dailyTimeSlots', async () => {
      const partialEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: { address: 'Test Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [
            { date: '2026-01-10', from: '18:00', to: '20:00' },
            { date: 'invalid-date', from: '18:00' }, // Should be filtered out
          ],
          categoryId: 'konzert',
        },
      ];

      const result = await service.normalize(partialEvents);

      expect(result[0].dailyTimeSlots).toHaveLength(1);
      expect(result[0].dailyTimeSlots[0].date).toBe('2026-01-10');
    });

    it('should map invalid categoryId to default', async () => {
      const partialEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: { address: 'Test Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'invalid-category',
        },
      ];

      const result = await service.normalize(partialEvents);

      expect(result[0].categoryId).toBe('default');
    });

    it('should preserve optional fields', async () => {
      const partialEvents: Partial<Event>[] = [
        {
          title: 'Test Event',
          description: 'Test Description',
          location: { address: 'Test Address', latitude: 0, longitude: 0 },
          dailyTimeSlots: [{ date: '2026-01-10' }],
          categoryId: 'konzert',
          price: 10,
          priceString: '10,00€',
          website: 'https://example.com',
          titleImageUrl: 'https://example.com/image.jpg',
        },
      ];

      const result = await service.normalize(partialEvents);

      expect(result[0].price).toBe(10);
      expect(result[0].priceString).toBe('10,00€');
      expect(result[0].website).toBe('https://example.com');
      expect(result[0].titleImageUrl).toBe('https://example.com/image.jpg');
    });
  });
});
