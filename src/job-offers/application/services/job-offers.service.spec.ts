import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobOffersService } from './job-offers.service';
import { JobOffer } from '../../domain/entities/job-offer.entity';
import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('JobOffersService', () => {
  let service: JobOffersService;
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
  let notificationService: jest.Mocked<Pick<NotificationService, 'sendToUser' | 'sendToUsers'>>;
  let usersService: jest.Mocked<UsersService>;

  const mockNotificationService = {
    sendToUser: jest.fn(),
  };

  const mockUsersService = {
    getAllUserProfilesWithIds: jest.fn(),
  };

  const mockJobOfferData = {
    title: 'Test Job',
    companyLogo: '',
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockJobOffer: JobOffer = new JobOffer({
    id: 'job1',
    ...mockJobOfferData,
  });

  beforeEach(async () => {
    mockDoc = {
      id: 'job1',
      exists: true,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'job1',
        data: () => mockJobOfferData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'job-new' }),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'job1', data: () => mockJobOfferData }],
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOffersService,
        {
          provide: FirebaseService,
          useValue: { getFirestore: jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) }) },
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<JobOffersService>(JobOffersService);
    notificationService = module.get(NotificationService);
    usersService = module.get(UsersService);
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

      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.generalDescription).toBe(createDto.generalDescription);
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should send notification when preference is enabled', async () => {
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

      const savedJobOffer = JobOffer.create(createDto);
      mockCollection.add.mockResolvedValue({ id: savedJobOffer.id });
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newJobOffers: true,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.create(createDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user1', {
        title: 'Neues Job-Angebot',
        body: 'New Job - category1',
        data: {
          type: 'NEW_JOB_OFFER',
          jobOfferId: savedJobOffer.id,
          jobTitle: 'New Job',
          jobOfferCategoryId: 'category1',
        },
      });
    });

    it('should not send notification when preference is disabled', async () => {
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

      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newJobOffers: false,
            },
            businessHistory: [],
          },
        },
      ]);

      await service.create(createDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send notification when preference is undefined (default: false)', async () => {
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

      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {},
            businessHistory: [],
          },
        },
      ]);

      await service.create(createDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
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

      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newJobOffers: true,
            },
            businessHistory: [],
          },
        },
      ]);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification failed'));

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all job offers', async () => {
      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockJobOffer.title);
      expect(mockCollection.get).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job offer by id', async () => {
      const result = await service.findOne('job1');

      expect(result).toBeDefined();
      expect(result.title).toBe(mockJobOffer.title);
      expect(mockCollection.doc).toHaveBeenCalledWith('job1');
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a job offer', async () => {
      const updateDto = {
        title: 'Updated Job',
        generalDescription: 'Updated Description',
      };

      const updatedJobOfferData = {
        ...mockJobOfferData,
        ...updateDto,
      };

      mockDoc.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'job1',
          data: () => mockJobOfferData,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'job1',
          data: () => updatedJobOfferData,
        });

      const result = await service.update('job1', updateDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.generalDescription).toBe(updateDto.generalDescription);
      expect(mockCollection.doc).toHaveBeenCalledWith('job1');
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.update('nonexistent', { title: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a job offer', async () => {
      await service.remove('job1');

      expect(mockCollection.doc).toHaveBeenCalledWith('job1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if job offer not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
