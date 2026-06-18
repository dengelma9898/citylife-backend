import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersService } from '../users/users.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import { CsvImportService } from './application/services/csv-import.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Event } from './interfaces/event.interface';
import { CsvImportResult } from './dto/csv-import-result.dto';
import { BulkUpdateEventCategoryResult } from './dto/bulk-update-event-category-result.dto';
import { UserType } from '../users/enums/user-type.enum';
import { EventStatus } from './enums/event-status.enum';

function makeRequest(uid = 'test-uid', signInProvider = 'password'): Request {
  return {
    user: {
      uid,
      firebase: { sign_in_provider: signInProvider },
    },
  } as Request;
}

describe('EventsController', () => {
  let controller: EventsController;
  let mockEventsService: {
    getAll: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    getByIds: jest.Mock;
    getPendingEvents: jest.Mock;
    approveEvent: jest.Mock;
    bulkUpdateCategory: jest.Mock;
  };
  let mockUsersService: {
    getBusinessUser: jest.Mock;
    addEventToUser: jest.Mock;
    addCreatedEventToUserProfile: jest.Mock;
    getUserProfile: jest.Mock;
  };
  let mockBusinessesService: { getById: jest.Mock; update: jest.Mock };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockCsvImportService = {
    importFromCsv: jest.fn(),
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

  const defaultUserProfile = {
    email: 'u@test.com',
    userType: UserType.USER,
    managementId: 'mgmt1',
    businessHistory: [],
  };

  beforeEach(async () => {
    mockEventsService = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getByIds: jest.fn(),
      getPendingEvents: jest.fn(),
      approveEvent: jest.fn(),
      bulkUpdateCategory: jest.fn(),
    };
    mockUsersService = {
      getBusinessUser: jest.fn(),
      addEventToUser: jest.fn(),
      addCreatedEventToUserProfile: jest.fn(),
      getUserProfile: jest.fn().mockResolvedValue(defaultUserProfile),
    };
    mockBusinessesService = {
      getById: jest.fn(),
      update: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: mockEventsService },
        { provide: FirebaseStorageService, useValue: mockFirebaseStorageService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: BusinessesService, useValue: mockBusinessesService },
        { provide: CsvImportService, useValue: mockCsvImportService },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all events', async () => {
      mockEventsService.getAll.mockResolvedValue([mockEvent]);
      const result = await controller.getAll();
      expect(result).toHaveLength(1);
      expect(mockEventsService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return an event by id for non-admin (no pending)', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);
      const result = await controller.getById('event1', makeRequest());
      expect(result.id).toBe(mockEvent.id);
      expect(mockEventsService.getById).toHaveBeenCalledWith('event1', {
        includePendingInResult: false,
      });
    });

    it('should pass includePendingInResult for admin', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({
        ...defaultUserProfile,
        userType: UserType.ADMIN,
      });
      mockEventsService.getById.mockResolvedValue(mockEvent);
      await controller.getById('event1', makeRequest());
      expect(mockEventsService.getById).toHaveBeenCalledWith('event1', {
        includePendingInResult: true,
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);
      await expect(controller.getById('nonexistent', makeRequest())).rejects.toThrow(
        NotFoundException,
      );
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
      dailyTimeSlots: [{ date: '2024-03-20', from: '10:00', to: '18:00' }],
    };

    it('should create event with PENDING for normal user', async () => {
      mockEventsService.create.mockResolvedValue({ id: 'newId', ...createDto });
      await controller.create(makeRequest(), createDto);
      expect(mockEventsService.create).toHaveBeenCalledWith(createDto, EventStatus.PENDING);
    });

    it('should create ACTIVE for admin', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({
        ...defaultUserProfile,
        userType: UserType.ADMIN,
      });
      mockEventsService.create.mockResolvedValue({ id: 'newId', ...createDto });
      await controller.create(makeRequest(), createDto);
      expect(mockEventsService.create).toHaveBeenCalledWith(createDto, EventStatus.ACTIVE);
    });

    it('should reject anonymous Firebase users', async () => {
      await expect(
        controller.create(makeRequest('anon', 'anonymous'), createDto),
      ).rejects.toThrow(ForbiddenException);
      expect(mockEventsService.create).not.toHaveBeenCalled();
    });

    it('should create with monthYear', async () => {
      const currentYear = new Date().getFullYear();
      const monthYear = `11.${currentYear}`;
      const dto = { ...createDto, dailyTimeSlots: [], monthYear };
      mockEventsService.create.mockResolvedValue({ id: 'newId', ...dto });
      await controller.create(makeRequest(), dto);
      expect(mockEventsService.create).toHaveBeenCalledWith(dto, EventStatus.PENDING);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Event', description: 'Updated Description' };

    it('should update an event', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockEventsService.update.mockResolvedValue({ ...mockEvent, ...updateDto });
      const result = await controller.update('event1', makeRequest(), updateDto);
      expect(result.title).toBe(updateDto.title);
      expect(mockEventsService.update).toHaveBeenCalledWith('event1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockEventsService.delete.mockResolvedValue(undefined);
      await controller.delete('event1', makeRequest());
      expect(mockEventsService.delete).toHaveBeenCalledWith('event1');
    });

    it('should throw NotFoundException if event not found', async () => {
      mockEventsService.getById.mockResolvedValue(null);
      await expect(controller.delete('nonexistent', makeRequest())).rejects.toThrow(
        NotFoundException,
      );
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
      mockEventsService.update.mockResolvedValue({ ...mockEvent, titleImageUrl: newImageUrl });
      const result = await controller.updateTitleImage('event1', makeRequest(), mockFile);
      expect(result.titleImageUrl).toBe(newImageUrl);
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
    ] as Express.Multer.File[];

    it('should add images to event', async () => {
      mockEventsService.getById.mockResolvedValue(mockEvent);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('new-image1.jpg');
      mockEventsService.update.mockResolvedValue({ ...mockEvent, imageUrls: ['new-image1.jpg'] });
      const result = await controller.addImages('event1', makeRequest(), mockFiles);
      expect(result.imageUrls).toEqual(['new-image1.jpg']);
    });
  });

  describe('removeImage', () => {
    it('should remove image from event', async () => {
      const imageUrl = 'test-image.jpg';
      mockEventsService.getById.mockResolvedValue({ ...mockEvent, imageUrls: [imageUrl] });
      mockEventsService.update.mockResolvedValue({ ...mockEvent, imageUrls: [] });
      const result = await controller.removeImage('event1', makeRequest(), imageUrl);
      expect(result.imageUrls).toEqual([]);
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
      dailyTimeSlots: [{ date: '2024-03-20', from: '10:00', to: '18:00' }],
    };

    it('should create event for business user', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue({ id: 'user1', eventIds: [] });
      mockUsersService.getUserProfile.mockResolvedValue(null);
      mockEventsService.create.mockResolvedValue({ id: 'newEventId', ...createDto });
      await controller.createEventForUser('user1', makeRequest('user1'), createDto);
      expect(mockEventsService.create).toHaveBeenCalledWith(createDto, EventStatus.PENDING);
      expect(mockUsersService.addEventToUser).toHaveBeenCalledWith('user1', 'newEventId');
    });

    it('should create for normal user profile with createdEventIds', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue(defaultUserProfile);
      mockEventsService.create.mockResolvedValue({ id: 'ne', ...createDto });
      await controller.createEventForUser('user1', makeRequest('user1'), createDto);
      expect(mockUsersService.addCreatedEventToUserProfile).toHaveBeenCalledWith('user1', 'ne');
    });

    it('should throw NotFound when no business or profile', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue(null);
      await expect(
        controller.createEventForUser('nope', makeRequest('nope'), createDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEventsByUserId', () => {
    it('should merge event ids from business user and profile', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue({ id: 'user1', eventIds: ['e1'] });
      mockUsersService.getUserProfile.mockResolvedValue({
        ...defaultUserProfile,
        createdEventIds: ['e2'],
      });
      mockEventsService.getByIds.mockResolvedValue([mockEvent]);
      await controller.getEventsByUserId('user1', makeRequest('user1'));
      expect(mockEventsService.getByIds).toHaveBeenCalledWith(['e1', 'e2'], {
        includeAllStatuses: true,
      });
    });

    it('should throw if user not found', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue(null);
      await expect(
        controller.getEventsByUserId('x', makeRequest('x')),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getByIdsQuery', () => {
    it('should return public events by ids', async () => {
      mockEventsService.getByIds.mockResolvedValue([mockEvent]);
      const result = await controller.getByIdsQuery('event1,event2');
      expect(result).toHaveLength(1);
      expect(mockEventsService.getByIds).toHaveBeenCalledWith(['event1', 'event2'], {
        includeAllStatuses: false,
      });
    });
  });

  describe('importFromCsv', () => {
    const mockCsvFile = {
      fieldname: 'file',
      originalname: 'events.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      buffer: Buffer.from('test'),
      size: 1024,
    } as Express.Multer.File;

    it('should import events from CSV file', async () => {
      const mockImportResult: CsvImportResult = {
        totalRows: 1,
        successful: 1,
        failed: 0,
        skipped: 0,
        results: [{ rowIndex: 1, success: true, eventId: 'event-1', errors: [] }],
      };
      mockCsvImportService.importFromCsv.mockResolvedValue(mockImportResult);
      const result = await controller.importFromCsv(makeRequest(), mockCsvFile);
      expect(result.successful).toBe(1);
      expect(mockCsvImportService.importFromCsv).toHaveBeenCalledWith(mockCsvFile);
    });
  });

  describe('bulkUpdateCategory', () => {
    it('should delegate bulk category update to service', async () => {
      const mockResult: BulkUpdateEventCategoryResult = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { eventId: 'event-1', success: true, event: mockEvent },
          { eventId: 'event-2', success: true, event: mockEvent },
        ],
      };
      mockEventsService.bulkUpdateCategory.mockResolvedValue(mockResult);
      const dto = { eventIds: ['event-1', 'event-2'], categoryId: 'category2' };
      const result = await controller.bulkUpdateCategory(dto);
      expect(result).toEqual(mockResult);
      expect(mockEventsService.bulkUpdateCategory).toHaveBeenCalledWith(
        ['event-1', 'event-2'],
        'category2',
      );
    });
  });
});
