import { Test, TestingModule } from '@nestjs/testing';
import { BusinessCategoriesService } from './business-categories.service';
import { BUSINESS_CATEGORY_REPOSITORY } from '../../domain/repositories/business-category.repository';
import { BusinessCategory } from '../../domain/entities/business-category.entity';
import { KeywordsService } from '../../../keywords/keywords.service';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('BusinessCategoriesService', () => {
  let service: BusinessCategoriesService;
  let businessCategoryRepository: any;
  let keywordsService: any;

  const mockBusinessCategoryRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  const mockKeywordsService = {
    getById: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn()
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessCategoriesService,
        {
          provide: BUSINESS_CATEGORY_REPOSITORY,
          useValue: mockBusinessCategoryRepository
        },
        {
          provide: KeywordsService,
          useValue: mockKeywordsService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    service = module.get<BusinessCategoriesService>(BusinessCategoriesService);
    businessCategoryRepository = module.get(BUSINESS_CATEGORY_REPOSITORY);
    keywordsService = module.get(KeywordsService);
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
        updatedAt: new Date().toISOString()
      }),
      BusinessCategory.fromProps({
        id: 'category2',
        name: 'Retail',
        iconName: 'shopping',
        description: 'Retail stores and shops',
        keywordIds: ['keyword3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ];

    it('should return all business categories', async () => {
      mockBusinessCategoryRepository.findAll.mockResolvedValue(mockCategories);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant');
      expect(result[1].name).toBe('Retail');
      expect(mockBusinessCategoryRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const mockCategory = BusinessCategory.fromProps({
      id: 'category1',
      name: 'Restaurant',
      iconName: 'restaurant',
      description: 'Restaurants and food services',
      keywordIds: ['keyword1', 'keyword2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    it('should return a business category by id', async () => {
      mockBusinessCategoryRepository.findById.mockResolvedValue(mockCategory);

      const result = await service.getById('category1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('category1');
      expect(result?.name).toBe('Restaurant');
      expect(mockBusinessCategoryRepository.findById).toHaveBeenCalledWith('category1');
    });

    it('should return null if category not found', async () => {
      mockBusinessCategoryRepository.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
      expect(mockBusinessCategoryRepository.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'Restaurant',
      iconName: 'restaurant',
      description: 'Restaurants and food services',
      keywordIds: ['keyword1', 'keyword2']
    };

    const mockCreatedCategory = BusinessCategory.fromProps({
      id: 'new-category',
      ...createDto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    it('should create a new business category', async () => {
      mockBusinessCategoryRepository.create.mockResolvedValue(mockCreatedCategory);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-category');
      expect(result.name).toBe(createDto.name);
      expect(result.iconName).toBe(createDto.iconName);
      expect(result.description).toBe(createDto.description);
      expect(result.keywordIds).toEqual(createDto.keywordIds);
      expect(mockBusinessCategoryRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Restaurant',
      iconName: 'updated-icon',
      description: 'Updated description',
      keywordIds: ['keyword3']
    };

    const existingCategory = BusinessCategory.fromProps({
      id: 'category1',
      name: 'Restaurant',
      iconName: 'restaurant',
      description: 'Restaurants and food services',
      keywordIds: ['keyword1', 'keyword2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const updatedCategory = BusinessCategory.fromProps({
      id: 'category1',
      ...updateDto,
      createdAt: existingCategory.createdAt,
      updatedAt: new Date().toISOString()
    });

    it('should update an existing business category', async () => {
      mockBusinessCategoryRepository.findById.mockResolvedValue(existingCategory);
      mockBusinessCategoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('category1');
      expect(result.name).toBe(updateDto.name);
      expect(result.iconName).toBe(updateDto.iconName);
      expect(result.description).toBe(updateDto.description);
      expect(result.keywordIds).toEqual(updateDto.keywordIds);
      expect(mockBusinessCategoryRepository.update).toHaveBeenCalledWith('category1', expect.any(BusinessCategory));
    });

    it('should throw error if category not found', async () => {
      mockBusinessCategoryRepository.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto))
        .rejects
        .toThrow('Business category not found');
    });
  });

  describe('delete', () => {
    it('should delete a business category', async () => {
      mockBusinessCategoryRepository.delete.mockResolvedValue(undefined);

      await service.delete('category1');

      expect(mockBusinessCategoryRepository.delete).toHaveBeenCalledWith('category1');
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
        updatedAt: new Date().toISOString()
      })
    ];

    const mockKeywords = [
      { id: 'keyword1', name: 'Italian' },
      { id: 'keyword2', name: 'Pizza' }
    ];

    it('should return categories with their keywords', async () => {
      mockBusinessCategoryRepository.findAll.mockResolvedValue(mockCategories);
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
        updatedAt: new Date().toISOString()
      });

      mockBusinessCategoryRepository.findAll.mockResolvedValue([categoryWithoutKeywords]);

      const result = await service.getAllWithKeywords();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].keywords).toBeDefined();
      expect(result[0].keywords).toHaveLength(0);
    });
  });
}); 