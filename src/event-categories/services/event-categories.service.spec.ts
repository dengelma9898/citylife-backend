import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventCategoriesService } from './event-categories.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { EventCategory } from '../interfaces/event-category.interface';
import { NotFoundException } from '@nestjs/common';

describe('EventCategoriesService', () => {
  let service: EventCategoriesService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    getFirestore: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockCategory: EventCategory = {
    id: 'category1',
    name: 'Test Category',
    description: 'Test Description',
    colorCode: '#FF0000',
    iconName: 'test-icon',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCategoriesService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<EventCategoriesService>(EventCategoriesService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all event categories', async () => {
      const mockFirestore = createFirestoreMock(mockCategory);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('category1');
    });
  });

  describe('findOne', () => {
    it('should return an event category by id', async () => {
      const mockFirestore = createFirestoreMock(mockCategory);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('category1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('category1');
    });

    it('should return null if category not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new event category', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto = {
        name: 'New Category',
        description: 'New Description',
        colorCode: '#00FF00',
        iconName: 'new-icon',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event category', async () => {
      const mockFirestore = createFirestoreMock(mockCategory);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateDto = {
        name: 'Updated Category',
      };

      const result = await service.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove an event category', async () => {
      const mockFirestore = createFirestoreMock(mockCategory);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.remove('category1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
