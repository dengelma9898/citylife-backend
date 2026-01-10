import { Test, TestingModule } from '@nestjs/testing';
import { MistralExtractorService } from './mistral-extractor.service';
import { CostTrackerService } from './cost-tracker.service';

describe('MistralExtractorService', () => {
  let service: MistralExtractorService;
  let costTracker: CostTrackerService;
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MistralExtractorService, CostTrackerService],
    }).compile();

    service = module.get<MistralExtractorService>(MistralExtractorService);
    costTracker = module.get<CostTrackerService>(CostTrackerService);

    // Mock OpenAI Client create method
    mockCreate = jest.fn();
    (service as any).client = {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractEvents', () => {
    it('should extract events successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                events: [
                  {
                    title: 'Test Event',
                    description: 'Test Description',
                    location: { address: 'Test Address', latitude: 0, longitude: 0 },
                    dailyTimeSlots: [{ date: '2026-01-10', from: '18:00', to: '20:00' }],
                    categoryId: 'konzert',
                  },
                ],
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 200,
        },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const html = '<html><body><div class="event">Test Event</div></body></html>';
      const result = await service.extractEvents(html);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Event');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should handle empty events array', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ events: [] }),
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 50,
        },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const html = '<html><body>No events</body></html>';
      const result = await service.extractEvents(html);

      expect(result).toHaveLength(0);
    });

    it('should throw error on API failure', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const html = '<html><body>Content</body></html>';

      await expect(service.extractEvents(html)).rejects.toThrow('API Error');
    });

    it('should throw error on empty response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 0,
        },
      };

      mockCreate.mockResolvedValue(mockResponse as any);

      const html = '<html><body>Content</body></html>';

      await expect(service.extractEvents(html)).rejects.toThrow('Keine Antwort von Mistral API erhalten');
    });
  });
});
