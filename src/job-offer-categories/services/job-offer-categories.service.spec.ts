import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobOfferCategoriesService } from './job-offer-categories.service';
import { JobCategory } from '../domain/entities/job-category.entity';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';
import { FirebaseService } from '../../firebase/firebase.service';

describe('JobOfferCategoriesService', () => {
  let service: JobOfferCategoriesService;
  let mockDoc: {
    id: string;
    exists: boolean;
    get: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    add: jest.Mock;
    get: jest.Mock;
  };

  const mockJobCategoryData = {
    name: 'Test Category',
    description: 'Test Description',
    colorCode: '#FF0000',
    iconName: 'test-icon',
    fallbackImages: [] as string[],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockJobCategory: JobCategory = JobCategory.fromProps({
    id: 'category1',
    ...mockJobCategoryData,
  });

  beforeEach(async () => {
    mockDoc = {
      id: 'category1',
      exists: true,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'category1',
        data: () => mockJobCategoryData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'category-new' }),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'category1', data: () => mockJobCategoryData }],
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferCategoriesService,
        {
          provide: FirebaseService,
          useValue: { getFirestore: jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) }) },
        },
      ],
    }).compile();

    service = module.get<JobOfferCategoriesService>(JobOfferCategoriesService);
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
        fallbackImages: [],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(mockCollection.add).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all job categories', async () => {
      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockJobCategory.name);
      expect(mockCollection.get).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job category by id', async () => {
      const result = await service.findOne('category1');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockJobCategory.name);
      expect(mockCollection.doc).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job category', async () => {
      const updateDto = {
        name: 'Updated Category',
        description: 'Updated Description',
      };

      const result = await service.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(mockCollection.doc).toHaveBeenCalledWith('category1');
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a job category', async () => {
      await service.remove('category1');

      expect(mockCollection.doc).toHaveBeenCalledWith('category1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
