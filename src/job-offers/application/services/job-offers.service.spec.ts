import { Test, TestingModule } from '@nestjs/testing';
import { JobOffersService } from './job-offers.service';
import { JobOffer } from '../../domain/entities/job-offer.entity';
import { JobOfferRepository, JOB_OFFER_REPOSITORY } from '../../domain/repositories/job-offer.repository.interface';
import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';
import { NotFoundException } from '@nestjs/common';

describe('JobOffersService', () => {
  let service: JobOffersService;
  let repository: JobOfferRepository;

  const mockJobOfferRepository = {
    save: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  const mockJobOffer: JobOffer = JobOffer.create({
    title: 'Test Job',
    generalDescription: 'Test Description',
    neededProfile: 'Test Profile',
    location: {
      address: 'Test Street',
      latitude: 49.4521,
      longitude: 11.0767
    },
    typeOfEmployment: 'Full-time',
    homeOffice: false,
    startDate: '2024-01-01',
    contactData: {
      email: 'test@example.com'
    },
    link: 'https://example.com',
    isHighlight: false,
    jobOfferCategoryId: 'category1',
    tasks: [],
    benefits: [],
    images: [],
    companyLogo: ''
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOffersService,
        {
          provide: JOB_OFFER_REPOSITORY,
          useValue: mockJobOfferRepository
        }
      ],
    }).compile();

    service = module.get<JobOffersService>(JobOffersService);
    repository = module.get<JobOfferRepository>(JOB_OFFER_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job offer', async () => {
      const createDto: CreateJobOfferDto = {
        title: 'New Job',
        generalDescription: 'New Description',
        neededProfile: 'New Profile',
        location: {
          address: 'New Street',
          latitude: 49.4521,
          longitude: 11.0767
        },
        typeOfEmployment: 'Full-time',
        homeOffice: false,
        startDate: '2024-01-01',
        contactData: {
          email: 'new@example.com'
        },
        link: 'https://example.com',
        isHighlight: false,
        jobOfferCategoryId: 'category1',
        tasks: [],
        benefits: [],
        images: [],
        companyLogo: ''
      };

      mockJobOfferRepository.save.mockResolvedValue(mockJobOffer);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(mockJobOffer.title);
      expect(result.generalDescription).toBe(mockJobOffer.generalDescription);
      expect(mockJobOfferRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all job offers', async () => {
      mockJobOfferRepository.findAll.mockResolvedValue([mockJobOffer]);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockJobOffer.title);
      expect(mockJobOfferRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job offer by id', async () => {
      mockJobOfferRepository.findById.mockResolvedValue(mockJobOffer);

      const result = await service.findOne('job1');

      expect(result).toBeDefined();
      expect(result.title).toBe(mockJobOffer.title);
      expect(mockJobOfferRepository.findById).toHaveBeenCalledWith('job1');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOfferRepository.findById.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(service.findOne('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job offer', async () => {
      const updateDto = {
        title: 'Updated Job',
        generalDescription: 'Updated Description'
      };

      const updatedJobOffer = JobOffer.create({
        ...mockJobOffer,
        ...updateDto
      });

      mockJobOfferRepository.findById.mockResolvedValue(mockJobOffer);
      mockJobOfferRepository.update.mockResolvedValue(updatedJobOffer);

      const result = await service.update('job1', updateDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.generalDescription).toBe(updateDto.generalDescription);
      expect(mockJobOfferRepository.findById).toHaveBeenCalledWith('job1');
      expect(mockJobOfferRepository.update).toHaveBeenCalledWith('job1', expect.objectContaining(updateDto));
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOfferRepository.findById.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(service.update('nonexistent', { title: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a job offer', async () => {
      mockJobOfferRepository.findById.mockResolvedValue(mockJobOffer);
      mockJobOfferRepository.delete.mockResolvedValue(undefined);

      await service.remove('job1');

      expect(mockJobOfferRepository.findById).toHaveBeenCalledWith('job1');
      expect(mockJobOfferRepository.delete).toHaveBeenCalledWith('job1');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOfferRepository.findById.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(service.remove('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 