import { Test, TestingModule } from '@nestjs/testing';
import { JobOfferCategoriesController } from './job-offer-categories.controller';
import { JobOfferCategoriesService } from './services/job-offer-categories.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { CreateJobCategoryDto } from './dto/create-job-category.dto';
import { NotFoundException } from '@nestjs/common';
import { JobCategory } from './domain/entities/job-category.entity';
import { Readable } from 'stream';

describe('JobOfferCategoriesController', () => {
  let controller: JobOfferCategoriesController;
  let service: JobOfferCategoriesService;
  let storageService: FirebaseStorageService;

  const mockJobOfferCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addFallbackImages: jest.fn(),
    removeFallbackImage: jest.fn()
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn()
  };

  const mockJobCategory: JobCategory = JobCategory.create({
    name: 'Test Category',
    description: 'Test Description',
    colorCode: '#FF0000',
    iconName: 'test-icon',
    fallbackImages: []
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobOfferCategoriesController],
      providers: [
        {
          provide: JobOfferCategoriesService,
          useValue: mockJobOfferCategoriesService
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService
        }
      ],
    }).compile();

    controller = module.get<JobOfferCategoriesController>(JobOfferCategoriesController);
    service = module.get<JobOfferCategoriesService>(JobOfferCategoriesService);
    storageService = module.get<FirebaseStorageService>(FirebaseStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job category', async () => {
      const createDto: CreateJobCategoryDto = {
        name: 'New Category',
        description: 'New Description',
        colorCode: '#00FF00',
        iconName: 'new-icon',
        fallbackImages: []
      };

      mockJobOfferCategoriesService.create.mockResolvedValue(mockJobCategory);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(mockJobCategory.name);
      expect(mockJobOfferCategoriesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all job categories', async () => {
      mockJobOfferCategoriesService.findAll.mockResolvedValue([mockJobCategory]);

      const result = await controller.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockJobCategory.name);
      expect(mockJobOfferCategoriesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job category by id', async () => {
      mockJobOfferCategoriesService.findOne.mockResolvedValue(mockJobCategory);

      const result = await controller.findOne('category1');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockJobCategory.name);
      expect(mockJobOfferCategoriesService.findOne).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobOfferCategoriesService.findOne.mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.findOne('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job category', async () => {
      const updateDto: CreateJobCategoryDto = {
        name: 'Updated Category',
        description: 'Updated Description',
        colorCode: '#00FF00',
        iconName: 'updated-icon',
        fallbackImages: []
      };

      mockJobOfferCategoriesService.update.mockResolvedValue({
        ...mockJobCategory,
        ...updateDto
      });

      const result = await controller.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(mockJobOfferCategoriesService.update).toHaveBeenCalledWith('category1', updateDto);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobOfferCategoriesService.update.mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.update('nonexistent', { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a job category', async () => {
      mockJobOfferCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove('category1');

      expect(mockJobOfferCategoriesService.remove).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobOfferCategoriesService.remove.mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.remove('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('addFallbackImages', () => {
    it('should add fallback images to a job category', async () => {
      const mockFiles = [
        {
          fieldname: 'file',
          originalname: 'image1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
          destination: '',
          filename: '',
          path: '',
          stream: new Readable()
        },
        {
          fieldname: 'file',
          originalname: 'image2.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
          destination: '',
          filename: '',
          path: '',
          stream: new Readable()
        }
      ];

      const categoryWithImages = {
        ...mockJobCategory,
        fallbackImages: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      };

      mockJobOfferCategoriesService.findOne.mockResolvedValue(mockJobCategory);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/image.jpg');
      mockJobOfferCategoriesService.update.mockResolvedValue(categoryWithImages);

      const result = await controller.addFallbackImages('category1', mockFiles);

      expect(result).toBeDefined();
      expect(result.fallbackImages).toHaveLength(2);
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockJobOfferCategoriesService.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobOfferCategoriesService.findOne.mockResolvedValue(null);

      await expect(controller.addFallbackImages('nonexistent', []))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('removeFallbackImage', () => {
    it('should remove a fallback image from a job category', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const categoryWithImage = {
        ...mockJobCategory,
        fallbackImages: [imageUrl]
      };
      const categoryWithoutImage = {
        ...mockJobCategory,
        fallbackImages: []
      };

      mockJobOfferCategoriesService.findOne.mockResolvedValue(categoryWithImage);
      mockJobOfferCategoriesService.update.mockResolvedValue(categoryWithoutImage);

      const result = await controller.removeFallbackImage('category1', imageUrl);

      expect(result).toBeDefined();
      expect(result.fallbackImages).toHaveLength(0);
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
      expect(mockJobOfferCategoriesService.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobOfferCategoriesService.findOne.mockResolvedValue(null);

      await expect(controller.removeFallbackImage('nonexistent', 'https://example.com/image.jpg'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException if image not found in category', async () => {
      mockJobOfferCategoriesService.findOne.mockResolvedValue(mockJobCategory);

      await expect(controller.removeFallbackImage('category1', 'https://example.com/nonexistent.jpg'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException if imageUrl is not provided', async () => {
      mockJobOfferCategoriesService.findOne.mockResolvedValue(mockJobCategory);

      await expect(controller.removeFallbackImage('category1', ''))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 