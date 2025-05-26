import { Test, TestingModule } from '@nestjs/testing';
import { JobOfferCategoriesService } from './job-offer-categories.service';
import { JobCategory } from '../domain/entities/job-category.entity';
import {
  JobCategoryRepository,
  JOB_CATEGORY_REPOSITORY,
} from '../domain/repositories/job-category.repository';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';
import { NotFoundException } from '@nestjs/common';

describe('JobOfferCategoriesService', () => {
  let service: JobOfferCategoriesService;
  let repository: JobCategoryRepository;

  const mockJobCategoryRepository = {
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJobCategory: JobCategory = JobCategory.create({
    name: 'Test Category',
    description: 'Test Description',
    colorCode: '#FF0000',
    iconName: 'test-icon',
    fallbackImages: [],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferCategoriesService,
        {
          provide: JOB_CATEGORY_REPOSITORY,
          useValue: mockJobCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<JobOfferCategoriesService>(JobOfferCategoriesService);
    repository = module.get<JobCategoryRepository>(JOB_CATEGORY_REPOSITORY);
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

      mockJobCategoryRepository.save.mockResolvedValue(createDto);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(mockJobCategoryRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all job categories', async () => {
      mockJobCategoryRepository.findAll.mockResolvedValue([mockJobCategory]);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockJobCategory.name);
      expect(mockJobCategoryRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job category by id', async () => {
      mockJobCategoryRepository.findById.mockResolvedValue(mockJobCategory);

      const result = await service.findOne('category1');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockJobCategory.name);
      expect(mockJobCategoryRepository.findById).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobCategoryRepository.findById.mockRejectedValue(new Error('Not found'));

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job category', async () => {
      const updateDto = {
        name: 'Updated Category',
        description: 'Updated Description',
      };

      const updatedCategory = JobCategory.create({
        ...mockJobCategory,
        ...updateDto,
      });

      mockJobCategoryRepository.findById.mockResolvedValue(mockJobCategory);
      mockJobCategoryRepository.update.mockResolvedValue(updatedCategory);

      const result = await service.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(mockJobCategoryRepository.findById).toHaveBeenCalledWith('category1');
      expect(mockJobCategoryRepository.update).toHaveBeenCalledWith(
        'category1',
        expect.objectContaining(updateDto),
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobCategoryRepository.findById.mockRejectedValue(new Error('Not found'));

      await expect(service.update('nonexistent', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a job category', async () => {
      mockJobCategoryRepository.findById.mockResolvedValue(mockJobCategory);
      mockJobCategoryRepository.delete.mockResolvedValue(undefined);

      await service.remove('category1');

      expect(mockJobCategoryRepository.findById).toHaveBeenCalledWith('category1');
      expect(mockJobCategoryRepository.delete).toHaveBeenCalledWith('category1');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockJobCategoryRepository.findById.mockRejectedValue(new Error('Not found'));

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
