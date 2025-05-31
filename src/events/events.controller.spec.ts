import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { ScraperService } from './infrastructure/scraping/scraper.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersService } from '../users/users.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import { CreateEventDto } from './dto/create-event.dto';
import { NotFoundException } from '@nestjs/common';
import { Event } from './interfaces/event.interface';
import { ScraperType } from './infrastructure/scraping/base-scraper.interface';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: EventsService;
  let scraperService: ScraperService;
  let firebaseStorageService: FirebaseStorageService;
  let usersService: UsersService;
  let businessesService: BusinessesService;

  const mockEventsService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getByIds: jest.fn(),
    importEventsFromEventFinder: jest.fn().mockResolvedValue([]),
  };

  const mockScraperService = {
    activateScraper: jest.fn(),
    getScraper: jest.fn(),
    getActiveScrapers: jest.fn(),
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockUsersService = {
    getBusinessUser: jest.fn(),
    addEventToUser: jest.fn(),
  };

  const mockBusinessesService = {
    getById: jest.fn(),
    addEventToBusiness: jest.fn(),
  };

  const mockEvent: Event = {
    id: '1',
    title: 'Test Event',
    description: 'Test Description',
    location: {
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    },
    startDate: '2024-03-20',
    endDate: '2024-03-20',
    categoryId: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: ScraperService,
          useValue: mockScraperService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: BusinessesService,
          useValue: mockBusinessesService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventsService = module.get<EventsService>(EventsService);
    scraperService = module.get<ScraperService>(ScraperService);
    firebaseStorageService = module.get<FirebaseStorageService>(FirebaseStorageService);
    usersService = module.get<UsersService>(UsersService);
    businessesService = module.get<BusinessesService>(BusinessesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all events', async () => {
      mockEventsService.getAll.mockResolvedValue([mockEvent]);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockEvent.id);
      expect(result[0].title).toBe(mockEvent.title);
      expect(mockEventsService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return an event by id', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);

      const result = await controller.getById('event1');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockEvent.id);
      expect(result.title).toBe(mockEvent.title);
      expect(mockEventsService.getById).toHaveBeenCalledWith('event1');
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);

      await expect(controller.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateEventDto = {
      title: 'New Event',
      description: 'New Description',
      address: 'New Address',
      latitude: 52.520008,
      longitude: 13.404954,
      categoryId: 'category1',
      dailyTimeSlots: [
        {
          date: '2024-03-20',
          from: '10:00',
          to: '18:00',
        },
      ],
    };

    it('should create a new event', async () => {
      mockEventsService.create.mockResolvedValue({
        id: 'newEventId',
        ...createDto,
      });

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('newEventId');
      expect(result.title).toBe(createDto.title);
      expect(mockEventsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Event',
      description: 'Updated Description',
    };

    it('should update an event', async () => {
      mockEventsService.update.mockResolvedValue({
        ...mockEvent,
        ...updateDto,
      });

      const result = await controller.update('event1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockEvent.id);
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(mockEventsService.update).toHaveBeenCalledWith('event1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockEventsService.delete.mockResolvedValue(undefined);

      await controller.delete('event1');

      expect(mockEventsService.delete).toHaveBeenCalledWith('event1');
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);

      await expect(controller.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTitleImage', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
    } as Express.Multer.File;

    it('should update title image', async () => {
      const newImageUrl = 'new-image.jpg';
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(newImageUrl);
      mockEventsService.update.mockResolvedValue({
        ...mockEvent,
        titleImageUrl: newImageUrl,
      });

      const result = await controller.updateTitleImage('event1', mockFile);

      expect(result).toBeDefined();
      expect(result.titleImageUrl).toBe(newImageUrl);
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockEventsService.update).toHaveBeenCalledWith('event1', {
        titleImageUrl: newImageUrl,
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);

      await expect(controller.updateTitleImage('nonexistent', mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addImages', () => {
    const mockFiles = [
      {
        fieldname: 'images',
        originalname: 'test1.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test1'),
        size: 1024,
      },
      {
        fieldname: 'images',
        originalname: 'test2.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test2'),
        size: 1024,
      },
    ] as Express.Multer.File[];

    it('should add images to event', async () => {
      const newImageUrls = ['new-image1.jpg', 'new-image2.jpg'];
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockFirebaseStorageService.uploadFile
        .mockResolvedValueOnce(newImageUrls[0])
        .mockResolvedValueOnce(newImageUrls[1]);
      mockEventsService.update.mockResolvedValue({
        ...mockEvent,
        imageUrls: newImageUrls,
      });

      const result = await controller.addImages('event1', mockFiles);

      expect(result).toBeDefined();
      expect(result.imageUrls).toEqual(newImageUrls);
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockEventsService.update).toHaveBeenCalledWith('event1', {
        imageUrls: newImageUrls,
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);

      await expect(controller.addImages('nonexistent', mockFiles)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeImage', () => {
    it('should remove image from event', async () => {
      const imageUrl = 'test-image.jpg';
      mockEventsService.getById.mockResolvedValue({
        ...mockEvent,
        imageUrls: [imageUrl],
      });
      mockEventsService.update.mockResolvedValue({
        ...mockEvent,
        imageUrls: [],
      });

      const result = await controller.removeImage('event1', imageUrl);

      expect(result).toBeDefined();
      expect(result.imageUrls).not.toContain(imageUrl);
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
      expect(mockEventsService.update).toHaveBeenCalledWith('event1', {
        imageUrls: [],
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);

      await expect(controller.removeImage('nonexistent', 'test-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if image not found in event', async () => {
      mockEventsService.getById.mockResolvedValue({
        ...mockEvent,
        imageUrls: ['other-image.jpg'],
      });

      await expect(controller.removeImage('event1', 'test-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEventForUser', () => {
    const createDto: CreateEventDto = {
      title: 'New Event',
      description: 'New Description',
      address: 'New Address',
      latitude: 52.520008,
      longitude: 13.404954,
      categoryId: 'category1',
      dailyTimeSlots: [
        {
          date: '2024-03-20',
          from: '10:00',
          to: '18:00',
        },
      ],
    };

    it('should create event for user', async () => {
      const mockBusinessUser = {
        id: 'user1',
        eventIds: [],
      };

      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);
      mockEventsService.create.mockResolvedValue({
        id: 'newEventId',
        ...createDto,
      });

      const result = await controller.createEventForUser('user1', createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('newEventId');
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith('user1');
      expect(mockEventsService.create).toHaveBeenCalledWith(createDto);
      expect(mockUsersService.addEventToUser).toHaveBeenCalledWith('user1', 'newEventId');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);

      await expect(controller.createEventForUser('nonexistent', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEventsByUserId', () => {
    it('should return events for user', async () => {
      const mockBusinessUser = {
        id: 'user1',
        eventIds: ['event1'],
      };

      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);
      mockEventsService.getByIds.mockResolvedValue([mockEvent]);

      const result = await controller.getEventsByUserId('user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockEvent.id);
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith('user1');
      expect(mockEventsService.getByIds).toHaveBeenCalledWith(['event1']);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);

      await expect(controller.getEventsByUserId('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array if user has no events', async () => {
      const mockBusinessUser = {
        id: 'user1',
        eventIds: [],
      };

      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);

      const result = await controller.getEventsByUserId('user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockEventsService.getByIds).not.toHaveBeenCalled();
    });
  });

  describe('getByIds', () => {
    it('should return events by ids', async () => {
      mockEventsService.getByIds.mockResolvedValue([mockEvent]);

      const result = await controller.getByIds('event1,event2');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockEvent.id);
      expect(mockEventsService.getByIds).toHaveBeenCalledWith(['event1', 'event2']);
    });

    it('should return empty array if no ids provided', async () => {
      const result = await controller.getByIds('');

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockEventsService.getByIds).not.toHaveBeenCalled();
    });
  });

  describe('scrapeEvents', () => {
    it('should return events from scraper', async () => {
      const mockScraper = {
        scrapeEvents: jest.fn().mockResolvedValue([mockEvent])
      };
      mockScraperService.getScraper.mockReturnValue(mockScraper);

      const result = await controller.scrapeEvents(
        ScraperType.EVENTFINDER,
        null,
        '2024-03-20',
        '2024-03-27',
        10
      );

      expect(result).toEqual([mockEvent]);
      expect(mockScraperService.getScraper).toHaveBeenCalledWith(ScraperType.EVENTFINDER);
      expect(mockScraper.scrapeEvents).toHaveBeenCalledWith({
        category: null,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        maxResults: 10
      });
    });

    it('should throw error for invalid scraper type', async () => {
      await expect(controller.scrapeEvents(
        'INVALID_TYPE' as ScraperType,
        null,
        '2024-03-20',
        '2024-03-27'
      )).rejects.toThrow('Ungültiger Scraper-Typ');
    });
  });
});
