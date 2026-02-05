import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { EventCategoriesService } from '../event-categories/services/event-categories.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { NotFoundException } from '@nestjs/common';
import { ScraperService } from './infrastructure/scraping/scraper.service';
import { NotificationService } from '../notifications/application/services/notification.service';

describe('EventsService', () => {
  let service: EventsService;
  let firebaseService: FirebaseService;
  let usersService: jest.Mocked<UsersService>;
  let eventCategoriesService: EventCategoriesService;
  let notificationService: jest.Mocked<NotificationService>;

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
    getAllUserProfilesWithIds: jest.fn(),
  };

  const mockEventCategoriesService = {
    getById: jest.fn(),
  };

  const mockScraperService = {
    scrapeEvent: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
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
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    usersService = module.get(UsersService);
    eventCategoriesService = module.get<EventCategoriesService>(EventCategoriesService);
    notificationService = module.get(NotificationService);

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

  describe('NEW_EVENT Notification', () => {
    const mockCreateEventDto: CreateEventDto = {
      title: 'Test Event',
      description: 'Test Description',
      address: 'Test Location',
      latitude: 0,
      longitude: 0,
      categoryId: 'category1',
      dailyTimeSlots: [],
    };

    it('should send notification when preference is enabled', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newEvents: true,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.create(mockCreateEventDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user1', {
        title: 'Neues Event verfügbar',
        body: expect.stringContaining('Test Event'),
        data: {
          type: 'NEW_EVENT',
          eventId: 'mock-id',
          eventTitle: 'Test Event',
          categoryId: 'category1',
        },
      });
    });

    it('should not send notification when preference is disabled', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newEvents: false,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.create(mockCreateEventDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should send notification when preference is undefined (default: true)', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {},
            businessHistory: [],
          },
        },
      ]);

      await service.create(mockCreateEventDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });

    it('should not send notification when no users with enabled preference exist', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newEvents: false,
            },
            businessHistory: [],
          },
        },
        {
          id: 'user2',
          profile: {
            email: 'user2@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt2',
            notificationPreferences: {
              newEvents: false,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.create(mockCreateEventDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newEvents: true,
            },
            businessHistory: [],
          },
        },
      ]);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification error'));

      const result = await service.create(mockCreateEventDto);

      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });
  });

  describe('monthYear field', () => {
    const currentYear = new Date().getFullYear();
    const monthYear = `11.${currentYear}`;
    const dateStr = `${currentYear}-11-15`;

    it('should create event with monthYear field', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      const createEventDto: CreateEventDto = {
        title: 'November Event',
        description: 'Event im November',
        address: 'Test Location',
        latitude: 49.45,
        longitude: 11.08,
        categoryId: 'konzert',
        dailyTimeSlots: [],
        monthYear,
      };

      const result = await service.create(createEventDto);

      expect(result).toBeDefined();
      expect(result.monthYear).toBe(monthYear);
      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          monthYear,
        }),
      );
    });

    it('should create event without monthYear field (backwards compatibility)', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      const createEventDto: CreateEventDto = {
        title: 'Test Event',
        description: 'Test Description',
        address: 'Test Location',
        latitude: 49.45,
        longitude: 11.08,
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: dateStr, from: '18:00', to: '22:00' }],
      };

      const result = await service.create(createEventDto);

      expect(result).toBeDefined();
      expect(result.monthYear).toBeUndefined();
    });

    it('should create event with both monthYear and dailyTimeSlots', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      const createEventDto: CreateEventDto = {
        title: 'Mixed Event',
        description: 'Event mit Monat und genauen Daten',
        address: 'Test Location',
        latitude: 49.45,
        longitude: 11.08,
        categoryId: 'konzert',
        dailyTimeSlots: [{ date: dateStr, from: '18:00', to: '22:00' }],
        monthYear,
      };

      const result = await service.create(createEventDto);

      expect(result).toBeDefined();
      expect(result.monthYear).toBe(monthYear);
      expect(result.dailyTimeSlots).toHaveLength(1);
    });
  });

  describe('FAV_EVENT_UPDATE Notification', () => {
    const mockOldEvent: Event = {
      id: 'event1',
      title: 'Old Event Title',
      description: 'Old Description',
      location: {
        address: 'Old Location',
        latitude: 0,
        longitude: 0,
      },
      categoryId: 'category1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      dailyTimeSlots: [],
    };

    const mockNewEvent: Event = {
      id: 'event1',
      title: 'New Event Title',
      description: 'New Description',
      location: {
        address: 'New Location',
        latitude: 1,
        longitude: 1,
      },
      categoryId: 'category1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      dailyTimeSlots: [],
    };

    it('should send notification only to users who favorited the event', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockNewEvent,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['event1'],
            notificationPreferences: {
              eventUpdates: true,
            },
            businessHistory: [],
          },
        },
        {
          id: 'user2',
          profile: {
            email: 'user2@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt2',
            favoriteEventIds: [],
            notificationPreferences: {
              eventUpdates: true,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.update('event1', { title: 'New Event Title' });

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user1', {
        title: 'Event wurde aktualisiert',
        body: 'New Event Title wurde aktualisiert',
        data: {
          type: 'FAV_EVENT_UPDATE',
          eventId: 'event1',
          eventTitle: 'New Event Title',
          updateType: expect.any(String),
        },
      });
    });

    it('should not send notification when preference is disabled', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockNewEvent,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['event1'],
            notificationPreferences: {
              eventUpdates: false,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.update('event1', { title: 'New Event Title' });

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should send notification when preference is undefined (default: true)', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockNewEvent,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['event1'],
            notificationPreferences: {},
            businessHistory: [],
          },
        },
      ]);

      await service.update('event1', { title: 'New Event Title' });

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });

    it('should not send notification when event is not favorited', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockNewEvent,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['other-event'],
            notificationPreferences: {
              eventUpdates: true,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.update('event1', { title: 'New Event Title' });

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should determine update type correctly', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      const updatedEventWithNewTime = {
        ...mockNewEvent,
        dailyTimeSlots: [{ date: '2024-01-03', from: '10:00', to: '12:00' }],
      };
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => updatedEventWithNewTime,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['event1'],
            notificationPreferences: {
              eventUpdates: true,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.update('event1', { dailyTimeSlots: [{ date: '2024-01-03', from: '10:00', to: '12:00' }] });

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user1',
        expect.objectContaining({
          data: expect.objectContaining({
            updateType: expect.any(String),
          }),
        }),
      );
    });

    it('should handle notification errors gracefully', async () => {
      const mockFirestore = createFirestoreMock(mockOldEvent);
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockOldEvent,
      });
      mockFirestore.collection().doc().get.mockResolvedValueOnce({
        exists: true,
        data: () => mockNewEvent,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            favoriteEventIds: ['event1'],
            notificationPreferences: {
              eventUpdates: true,
            },
            businessHistory: [],
          },
        },
      ]);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification error'));

      const result = await service.update('event1', { title: 'New Event Title' });

      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });
  });
});
