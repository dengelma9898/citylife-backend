import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { EventCategoriesService } from '../event-categories/services/event-categories.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { NotFoundException } from '@nestjs/common';
import { ScraperService } from './infrastructure/scraping/scraper.service';

describe('EventsService', () => {
  let service: EventsService;
  let firebaseService: FirebaseService;
  let usersService: UsersService;
  let eventCategoriesService: EventCategoriesService;

  const createFirestoreMock = (mockData: any = {}) => {
    const mockDoc = {
      id: 'mock-id',
      exists: true,
      data: () => mockData,
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'mock-id', data: () => mockData }],
      }),
    };

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  };

  const mockFirebaseService = {
    getFirestore: jest.fn().mockReturnValue(createFirestoreMock()),
  };

  const mockUsersService = {
    getById: jest.fn(),
  };

  const mockEventCategoriesService = {
    getById: jest.fn(),
  };

  const mockScraperService = {
    scrapeEvent: jest.fn(),
  };

  const mockEvent: Event = {
    id: 'event1',
    title: 'Test Event',
    description: 'Test Description',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-01-02T00:00:00.000Z',
    location: {
      address: 'Test Location',
      latitude: 0,
      longitude: 0,
    },
    categoryId: 'category1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EventCategoriesService,
          useValue: mockEventCategoriesService,
        },
        {
          provide: ScraperService,
          useValue: mockScraperService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    usersService = module.get<UsersService>(UsersService);
    eventCategoriesService = module.get<EventCategoriesService>(EventCategoriesService);

    jest.clearAllMocks();
  });

  describe('getByIds', () => {
    it('should return events by ids', async () => {
      const mockFirestore = createFirestoreMock(mockEvent);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getByIds(['event1']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event1');
    });

    it('should return empty array if no ids provided', async () => {
      const result = await service.getByIds([]);

      expect(result).toHaveLength(0);
    });

    it('should filter out non-existent events', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getByIds(['nonexistent']);

      expect(result).toHaveLength(0);
    });
  });
});
