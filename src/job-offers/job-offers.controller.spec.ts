import { Test, TestingModule } from '@nestjs/testing';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './application/services/job-offers.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { NotFoundException } from '@nestjs/common';
import { JobOffer } from './domain/entities/job-offer.entity';
import { Readable } from 'stream';

describe('JobOffersController', () => {
  let controller: JobOffersController;
  let service: JobOffersService;
  let storageService: FirebaseStorageService;

  const mockJobOffersService = {
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

  const mockJobOffer: JobOffer = JobOffer.create({
    title: 'Test Job',
    generalDescription: 'Test Description',
    neededProfile: 'Test Profile',
    location: {
      address: 'Test Street',
      latitude: 49.4521,
      longitude: 11.0767,
    },
    typeOfEmployment: 'Full-time',
    homeOffice: false,
    startDate: '2024-01-01',
    contactData: {
      email: 'test@example.com',
    },
    link: 'https://example.com',
    isHighlight: false,
    jobOfferCategoryId: 'category1',
    tasks: [],
    benefits: [],
    images: [],
    companyLogo: '',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobOffersController],
      providers: [
        {
          provide: JobOffersService,
          useValue: mockJobOffersService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
      ],
    }).compile();

    controller = module.get<JobOffersController>(JobOffersController);
    service = module.get<JobOffersService>(JobOffersService);
    storageService = module.get<FirebaseStorageService>(FirebaseStorageService);
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
          longitude: 11.0767,
        },
        typeOfEmployment: 'Full-time',
        homeOffice: false,
        startDate: '2024-01-01',
        contactData: {
          email: 'new@example.com',
        },
        link: 'https://example.com',
        isHighlight: false,
        jobOfferCategoryId: 'category1',
        tasks: [],
        benefits: [],
        images: [],
        companyLogo: '',
      };

      mockJobOffersService.create.mockResolvedValue(mockJobOffer);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(mockJobOffer.title);
      expect(mockJobOffersService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all job offers', async () => {
      mockJobOffersService.findAll.mockResolvedValue([mockJobOffer]);

      const result = await controller.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockJobOffer.title);
      expect(mockJobOffersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job offer by id', async () => {
      mockJobOffersService.findOne.mockResolvedValue(mockJobOffer);

      const result = await controller.findOne('job1');

      expect(result).toBeDefined();
      expect(result.title).toBe(mockJobOffer.title);
      expect(mockJobOffersService.findOne).toHaveBeenCalledWith('job1');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.findOne.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(controller.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job offer', async () => {
      const updateDto = {
        title: 'Updated Job',
        generalDescription: 'Updated Description',
      };

      mockJobOffersService.update.mockResolvedValue({
        ...mockJobOffer,
        ...updateDto,
      });

      const result = await controller.update('job1', updateDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.generalDescription).toBe(updateDto.generalDescription);
      expect(mockJobOffersService.update).toHaveBeenCalledWith('job1', updateDto);
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.update.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(controller.update('nonexistent', { title: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a job offer and its images', async () => {
      const jobOfferWithImages = {
        ...mockJobOffer,
        companyLogo: 'https://example.com/logo.jpg',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      mockJobOffersService.findOne.mockResolvedValue(jobOfferWithImages);
      mockJobOffersService.remove.mockResolvedValue(undefined);

      await controller.remove('job1');

      expect(mockJobOffersService.findOne).toHaveBeenCalledWith('job1');
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledTimes(3);
      expect(mockJobOffersService.remove).toHaveBeenCalledWith('job1');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.findOne.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(controller.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCompanyLogo', () => {
    it('should update company logo', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'logo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: new Readable(),
      };

      mockJobOffersService.findOne.mockResolvedValue(mockJobOffer);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/new-logo.jpg');
      mockJobOffersService.update.mockResolvedValue({
        ...mockJobOffer,
        companyLogo: 'https://example.com/new-logo.jpg',
      });

      const result = await controller.updateCompanyLogo('job1', mockFile);

      expect(result).toBeDefined();
      expect(result.companyLogo).toBe('https://example.com/new-logo.jpg');
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockJobOffersService.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.findOne.mockRejectedValue(new NotFoundException('Job offer not found'));

      const mockFile = {
        fieldname: 'file',
        originalname: 'logo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
        destination: '',
        filename: '',
        path: '',
        stream: new Readable(),
      };

      await expect(controller.updateCompanyLogo('nonexistent', mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addImages', () => {
    it('should add images to job offer', async () => {
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
          stream: new Readable(),
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
          stream: new Readable(),
        },
      ];

      mockJobOffersService.findOne.mockResolvedValue(mockJobOffer);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/image.jpg');
      mockJobOffersService.update.mockResolvedValue({
        ...mockJobOffer,
        images: ['https://example.com/image.jpg'],
      });

      const result = await controller.addImages('job1', mockFiles);

      expect(result).toBeDefined();
      expect(result.images).toHaveLength(1);
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(mockJobOffersService.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.findOne.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(controller.addImages('nonexistent', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeImage', () => {
    it('should remove an image from job offer', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const jobOfferWithImage = {
        ...mockJobOffer,
        images: [imageUrl],
      };

      mockJobOffersService.findOne.mockResolvedValue(jobOfferWithImage);
      mockJobOffersService.update.mockResolvedValue({
        ...mockJobOffer,
        images: [],
      });

      const result = await controller.removeImage('job1', imageUrl);

      expect(result).toBeDefined();
      expect(result.images).toHaveLength(0);
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(imageUrl);
      expect(mockJobOffersService.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockJobOffersService.findOne.mockRejectedValue(new NotFoundException('Job offer not found'));

      await expect(
        controller.removeImage('nonexistent', 'https://example.com/image.jpg'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if image not found in job offer', async () => {
      mockJobOffersService.findOne.mockResolvedValue(mockJobOffer);

      await expect(
        controller.removeImage('job1', 'https://example.com/nonexistent.jpg'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if imageUrl is not provided', async () => {
      mockJobOffersService.findOne.mockResolvedValue(mockJobOffer);

      await expect(controller.removeImage('job1', '')).rejects.toThrow(NotFoundException);
    });
  });
});
