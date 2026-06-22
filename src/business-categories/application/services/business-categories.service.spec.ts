import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BusinessCategoriesService } from './business-categories.service';
import { BusinessCategory } from '../../domain/entities/business-category.entity';
import { KeywordsService } from '../../../keywords/keywords.service';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('BusinessCategoriesService', () => {
  let service: BusinessCategoriesService;
  let mockDoc: {
    get: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    add: jest.Mock;
    get: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };
  let mockFirebaseService: { getFirestore: jest.Mock };

  const mockKeywordsService = {
    getById: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockCategoryData = {
    name: 'Restaurant',
    iconName: 'restaurant',
    description: 'Restaurants and food services',
    keywordIds: ['keyword1', 'keyword2'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'category1',
        data: () => mockCategoryData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'new-category' }),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'category1', data: () => mockCategoryData }],
      }),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue(mockFirestore),
    };
    mockCacheManager.get.mockResolvedValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessCategoriesService,
        { provide: KeywordsService, useValue: mockKeywordsService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<BusinessCategoriesService>(BusinessCategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    const mockCategories = [
      BusinessCategory.fromProps({
        id: 'category1',
        name: 'Restaurant',
        iconName: 'restaurant',
        description: 'Restaurants and food services',
        keywordIds: ['keyword1', 'keyword2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      BusinessCategory.fromProps({
        id: 'category2',
        name: 'Retail',
        iconName: 'shopping',
        description: 'Retail stores and shops',
        keywordIds: ['keyword3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ];

    it('should return all business categories', async () => {
      mockCollection.get.mockResolvedValue({
        docs: mockCategories.map(category => ({
          id: category.id,
          data: () => {
            const { id, ...data } = category.toJSON();
            return data;
          },
        })),
      });
      const result = await service.getAll();
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant');
      expect(result[1].name).toBe('Retail');
      expect(mockCollection.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached business categories on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue(mockCategories);
      const result = await service.getAll();
      expect(result).toEqual(mockCategories);
      expect(mockCollection.get).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const mockCategory = BusinessCategory.fromProps({
      id: 'category1',
      ...mockCategoryData,
    });

    it('should return a business category by id', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'category1',
        data: () => {
          const { id, ...data } = mockCategory.toJSON();
          return data;
        },
      });
      const result = await service.getById('category1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('category1');
      expect(result?.name).toBe('Restaurant');
    });

    it('should return null if category not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Restaurant',
      iconName: 'restaurant',
      description: 'Restaurants and food services',
      keywordIds: ['keyword1', 'keyword2'],
    };

    it('should create a new business category', async () => {
      const result = await service.create(createDto);
      expect(result).toBeDefined();
      expect(result.id).toBe('new-category');
      expect(result.name).toBe(createDto.name);
      expect(result.iconName).toBe(createDto.iconName);
      expect(result.description).toBe(createDto.description);
      expect(result.keywordIds).toEqual(createDto.keywordIds);
      expect(mockCollection.add).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Restaurant',
      iconName: 'updated-icon',
      description: 'Updated description',
      keywordIds: ['keyword3'],
    };

    const existingCategory = BusinessCategory.fromProps({
      id: 'category1',
      name: 'Restaurant',
      iconName: 'restaurant',
      description: 'Restaurants and food services',
      keywordIds: ['keyword1', 'keyword2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    it('should update an existing business category', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'category1',
        data: () => {
          const { id, ...data } = existingCategory.toJSON();
          return data;
        },
      });
      const result = await service.update('category1', updateDto);
      expect(result).toBeDefined();
      expect(result.id).toBe('category1');
      expect(result.name).toBe(updateDto.name);
      expect(result.iconName).toBe(updateDto.iconName);
      expect(result.description).toBe(updateDto.description);
      expect(result.keywordIds).toEqual(updateDto.keywordIds);
      expect(mockDoc.update).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should throw error if category not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        'Business category not found',
      );
    });
  });

  describe('delete', () => {
    it('should delete a business category', async () => {
      await service.delete('category1');
      expect(mockDoc.delete).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllWithKeywords', () => {
    const mockCategories = [
      BusinessCategory.fromProps({
        id: 'category1',
        name: 'Restaurant',
        iconName: 'restaurant',
        description: 'Restaurants and food services',
        keywordIds: ['keyword1', 'keyword2'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ];

    const mockKeywords = [
      { id: 'keyword1', name: 'Italian' },
      { id: 'keyword2', name: 'Pizza' },
    ];

    it('should return categories with their keywords', async () => {
      mockCollection.get.mockResolvedValue({
        docs: mockCategories.map(category => ({
          id: category.id,
          data: () => {
            const { id, ...data } = category.toJSON();
            return data;
          },
        })),
      });
      mockKeywordsService.getById
        .mockResolvedValueOnce(mockKeywords[0])
        .mockResolvedValueOnce(mockKeywords[1]);
      const result = await service.getAllWithKeywords();
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].keywords).toBeDefined();
      expect(result[0].keywords).toHaveLength(2);
      expect(result[0].keywords?.[0].name).toBe('Italian');
      expect(result[0].keywords?.[1].name).toBe('Pizza');
    });

    it('should handle categories without keywords', async () => {
      const categoryWithoutKeywords = BusinessCategory.fromProps({
        id: 'category2',
        name: 'Retail',
        iconName: 'shopping',
        description: 'Retail stores',
        keywordIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockCollection.get.mockResolvedValue({
        docs: [
          {
            id: categoryWithoutKeywords.id,
            data: () => {
              const { id, ...data } = categoryWithoutKeywords.toJSON();
              return data;
            },
          },
        ],
      });
      const result = await service.getAllWithKeywords();
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].keywords).toBeDefined();
      expect(result[0].keywords).toHaveLength(0);
    });
  });
});
