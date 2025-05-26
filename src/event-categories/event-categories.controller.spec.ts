import { Test, TestingModule } from '@nestjs/testing';
import { EventCategoriesController } from './event-categories.controller';
import { EventCategoriesService } from './services/event-categories.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { NotFoundException } from '@nestjs/common';

describe('EventCategoriesController', () => {
  let controller: EventCategoriesController;
  let eventCategoriesService: EventCategoriesService;
  let firebaseStorageService: FirebaseStorageService;

  const mockEventCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventCategoriesController],
      providers: [
        {
          provide: EventCategoriesService,
          useValue: mockEventCategoriesService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
      ],
    }).compile();

    controller = module.get<EventCategoriesController>(EventCategoriesController);
    eventCategoriesService = module.get<EventCategoriesService>(EventCategoriesService);
    firebaseStorageService = module.get<FirebaseStorageService>(FirebaseStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateEventCategoryDto = {
      name: 'New Category',
      description: 'New Description',
      colorCode: '#00FF00',
      iconName: 'newIcon',
    };

    it('should create a new event category', async () => {
      const mockCategory = {
        id: 'category1',
        ...createDto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.create.mockResolvedValue(mockCategory);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('category1');
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(mockEventCategoriesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all event categories', async () => {
      const mockCategories = [
        {
          id: 'category1',
          name: 'Test Category 1',
          description: 'Description 1',
          colorCode: '#FF0000',
          iconName: 'icon1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockEventCategoriesService.findAll.mockResolvedValue(mockCategories);

      const result = await controller.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('category1');
      expect(result[0].name).toBe('Test Category 1');
      expect(mockEventCategoriesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an event category by id', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category 1',
        description: 'Description 1',
        colorCode: '#FF0000',
        iconName: 'icon1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('category1');

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('category1');
        expect(result.name).toBe('Test Category 1');
      }
      expect(mockEventCategoriesService.findOne).toHaveBeenCalledWith('category1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateEventCategoryDto = {
      name: 'Updated Category',
      description: 'Updated Description',
    };

    it('should update an event category', async () => {
      const mockCategory = {
        id: 'category1',
        ...updateDto,
        colorCode: '#FF0000',
        iconName: 'icon1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.update.mockResolvedValue(mockCategory);

      const result = await controller.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('category1');
        expect(result.name).toBe(updateDto.name);
        expect(result.description).toBe(updateDto.description);
      }
      expect(mockEventCategoriesService.update).toHaveBeenCalledWith('category1', updateDto);
    });
  });

  describe('remove', () => {
    it('should remove an event category', async () => {
      mockEventCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove('category1');

      expect(mockEventCategoriesService.remove).toHaveBeenCalledWith('category1');
    });
  });

  describe('addFallbackImages', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
    } as Express.Multer.File;

    it('should add fallback images to an event category', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category',
        description: 'Description',
        colorCode: '#FF0000',
        iconName: 'icon1',
        fallbackImages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newImageUrl = 'new-image.jpg';

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(newImageUrl);
      mockEventCategoriesService.update.mockResolvedValue({
        ...mockCategory,
        fallbackImages: [newImageUrl],
      });

      const result = await controller.addFallbackImages('category1', [mockFile]);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.fallbackImages).toContain(newImageUrl);
      }
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockEventCategoriesService.update).toHaveBeenCalledWith('category1', {
        fallbackImages: [newImageUrl],
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockEventCategoriesService.findOne.mockResolvedValue(null);

      await expect(controller.addFallbackImages('nonexistent', [mockFile])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty files array', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category',
        description: 'Description',
        colorCode: '#FF0000',
        iconName: 'icon1',
        fallbackImages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);
      mockEventCategoriesService.update.mockResolvedValue(mockCategory);

      const result = await controller.addFallbackImages('category1', []);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.fallbackImages).toEqual([]);
      }
      expect(mockFirebaseStorageService.uploadFile).not.toHaveBeenCalled();
      expect(mockEventCategoriesService.update).toHaveBeenCalledWith('category1', {
        fallbackImages: [],
      });
    });
  });

  describe('removeFallbackImage', () => {
    it('should remove a fallback image from an event category', async () => {
      const imageUrl = 'test-image.jpg';
      const mockCategory = {
        id: 'category1',
        name: 'Test Category',
        description: 'Description',
        colorCode: '#FF0000',
        iconName: 'icon1',
        fallbackImages: [imageUrl],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);
      mockEventCategoriesService.update.mockResolvedValue({
        ...mockCategory,
        fallbackImages: [],
      });

      const result = await controller.removeFallbackImage('category1', imageUrl);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.fallbackImages).not.toContain(imageUrl);
      }
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
      expect(mockEventCategoriesService.update).toHaveBeenCalledWith('category1', {
        fallbackImages: [],
      });
    });

    it('should throw NotFoundException if category not found', async () => {
      mockEventCategoriesService.findOne.mockResolvedValue(null);

      await expect(controller.removeFallbackImage('nonexistent', 'test-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if image not found in category', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category',
        description: 'Description',
        colorCode: '#FF0000',
        iconName: 'icon1',
        fallbackImages: ['other-image.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);

      await expect(controller.removeFallbackImage('category1', 'test-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if imageUrl is not provided', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category',
        description: 'Description',
        colorCode: '#FF0000',
        iconName: 'icon1',
        fallbackImages: ['test-image.jpg'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockEventCategoriesService.findOne.mockResolvedValue(mockCategory);

      await expect(controller.removeFallbackImage('category1', '')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
