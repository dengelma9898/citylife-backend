import { Test, TestingModule } from '@nestjs/testing';
import { BusinessCategoriesController } from './business-categories.controller';
import { BusinessCategoriesService } from '../services/business-categories.service';
import { BusinessCategory } from '../../domain/entities/business-category.entity';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';

jest.mock('../../../firebase/firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  }))
}));

describe('BusinessCategoriesController', () => {
  let controller: BusinessCategoriesController;
  let service: BusinessCategoriesService;

  const mockBusinessCategoriesService = {
    getAll: jest.fn(),
    getAllWithKeywords: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
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
      controllers: [BusinessCategoriesController],
      providers: [
        {
          provide: BusinessCategoriesService,
          useValue: mockBusinessCategoriesService
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

    controller = module.get<BusinessCategoriesController>(BusinessCategoriesController);
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
      mockBusinessCategoriesService.getAll.mockResolvedValue(mockCategories);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant');
      expect(result[1].name).toBe('Retail');
      expect(mockBusinessCategoriesService.getAll).toHaveBeenCalled();
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
        keywords: [
          { id: 'keyword1', name: 'Italian' },
          { id: 'keyword2', name: 'Pizza' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ];

    it('should return all business categories with their keywords', async () => {
      mockBusinessCategoriesService.getAllWithKeywords.mockResolvedValue(mockCategories);

      const result = await controller.getAllWithKeywords();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].keywords).toBeDefined();
      expect(result[0].keywords).toHaveLength(2);
      expect(result[0].keywords?.[0].name).toBe('Italian');
      expect(result[0].keywords?.[1].name).toBe('Pizza');
      expect(mockBusinessCategoriesService.getAllWithKeywords).toHaveBeenCalled();
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
      mockBusinessCategoriesService.getById.mockResolvedValue(mockCategory);

      const result = await controller.getById('category1');

      expect(result).toBeDefined();
      expect(result.id).toBe('category1');
      expect(result.name).toBe('Restaurant');
      expect(mockBusinessCategoriesService.getById).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockBusinessCategoriesService.getById.mockResolvedValue(null);

      await expect(controller.getById('nonexistent'))
        .rejects
        .toThrow('Business category not found');
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
      mockBusinessCategoriesService.create.mockResolvedValue(mockCreatedCategory);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-category');
      expect(result.name).toBe(createDto.name);
      expect(result.iconName).toBe(createDto.iconName);
      expect(result.description).toBe(createDto.description);
      expect(result.keywordIds).toEqual(createDto.keywordIds);
      expect(mockBusinessCategoriesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Restaurant',
      iconName: 'updated-icon',
      description: 'Updated description',
      keywordIds: ['keyword3']
    };

    const mockUpdatedCategory = BusinessCategory.fromProps({
      id: 'category1',
      ...updateDto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    it('should update an existing business category', async () => {
      mockBusinessCategoriesService.update.mockResolvedValue(mockUpdatedCategory);

      const result = await controller.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('category1');
      expect(result.name).toBe(updateDto.name);
      expect(result.iconName).toBe(updateDto.iconName);
      expect(result.description).toBe(updateDto.description);
      expect(result.keywordIds).toEqual(updateDto.keywordIds);
      expect(mockBusinessCategoriesService.update).toHaveBeenCalledWith('category1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a business category', async () => {
      mockBusinessCategoriesService.delete.mockResolvedValue(undefined);

      await controller.delete('category1');

      expect(mockBusinessCategoriesService.delete).toHaveBeenCalledWith('category1');
    });
  });
}); 