import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesService } from './businesses.service';
import { BUSINESS_REPOSITORY } from '../../domain/repositories/business.repository';
import { UsersService } from '../../../users/users.service';
import { BusinessCategoriesService } from '../../../business-categories/application/services/business-categories.service';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';
import { Business, BusinessAddress, BusinessContact } from '../../domain/entities/business.entity';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { KeywordsService } from '../../../keywords/keywords.service';
import { EventsService } from '../../../events/events.service';

jest.mock('../../../firebase/firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  }))
}));

describe('BusinessesService', () => {
  let service: BusinessesService;

  const mockBusinessesRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    findByStatus: jest.fn(),
    findByStatusAndHasAccount: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };

  const mockUsersService = {
    getById: jest.fn()
  };

  const mockBusinessCategoriesService = {
    getById: jest.fn()
  };

  const mockKeywordsService = {
    getById: jest.fn()
  };

  const mockEventsService = {
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

  const mockBusinessAddress = BusinessAddress.create({
    street: 'Main Street',
    houseNumber: '123',
    postalCode: '90402',
    city: 'Nürnberg',
    latitude: 49.4521,
    longitude: 11.0767
  });

  const mockBusinessContact = BusinessContact.create({
    email: 'contact@business.com',
    phoneNumber: '+49123456789',
    website: 'https://business.com'
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        {
          provide: BUSINESS_REPOSITORY,
          useValue: mockBusinessesRepository
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: BusinessCategoriesService,
          useValue: mockBusinessCategoriesService
        },
        {
          provide: KeywordsService,
          useValue: mockKeywordsService
        },
        {
          provide: EventsService,
          useValue: mockEventsService
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

    service = module.get<BusinessesService>(BusinessesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    const mockBusinesses = [
      Business.create({
        name: 'Restaurant A',
        description: 'A great restaurant',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['category1'],
        keywordIds: ['keyword1'],
        openingHours: {
          monday: '09:00-22:00'
        },
        benefit: '10% discount',
        hasAccount: true,
        status: BusinessStatus.ACTIVE
      }),
      Business.create({
        name: 'Shop B',
        description: 'A nice shop',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['category2'],
        keywordIds: ['keyword2'],
        openingHours: {
          monday: '10:00-20:00'
        },
        benefit: 'Free shipping',
        hasAccount: true,
        status: BusinessStatus.ACTIVE
      })
    ];

    it('should return all businesses', async () => {
      mockBusinessesRepository.findAll.mockResolvedValue(mockBusinesses);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant A');
      expect(result[1].name).toBe('Shop B');
      expect(mockBusinessesRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const mockBusiness = Business.create({
      name: 'Restaurant A',
      description: 'A great restaurant',
      contact: mockBusinessContact,
      address: mockBusinessAddress,
      categoryIds: ['category1'],
      keywordIds: ['keyword1'],
      openingHours: {
        monday: '09:00-22:00'
      },
      benefit: '10% discount',
      hasAccount: true,
      status: BusinessStatus.ACTIVE
    });

    it('should return a business by id', async () => {
      mockBusinessesRepository.findById.mockResolvedValue(mockBusiness);

      const result = await service.getById('business1');

      expect(result).toBeDefined();
      expect(result?.id).toBeDefined();
      expect(result?.name).toBe('Restaurant A');
      expect(mockBusinessesRepository.findById).toHaveBeenCalledWith('business1');
    });

    it('should return null if business not found', async () => {
      mockBusinessesRepository.findById.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
      expect(mockBusinessesRepository.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    const createData = {
      name: 'New Restaurant',
      description: 'A new restaurant',
      contact: {
        email: 'contact@newrestaurant.com',
        phoneNumber: '+49123456789',
        website: 'https://newrestaurant.com'
      },
      address: {
        street: 'New Street',
        houseNumber: '456',
        postalCode: '90403',
        city: 'Nürnberg',
        latitude: 49.4522,
        longitude: 11.0768
      },
      openingHours: {
        monday: '08:00-23:00'
      },
      categoryIds: ['category1'],
      keywordIds: ['keyword1'],
      benefit: '15% discount',
      hasAccount: true
    };

    const mockCreatedBusiness = Business.create({
      name: createData.name,
      description: createData.description,
      contact: BusinessContact.create(createData.contact),
      address: BusinessAddress.create(createData.address),
      categoryIds: createData.categoryIds,
      keywordIds: createData.keywordIds,
      openingHours: createData.openingHours,
      benefit: createData.benefit,
      hasAccount: createData.hasAccount,
      status: BusinessStatus.PENDING
    });

    it('should create a new business', async () => {
      mockBusinessesRepository.create.mockResolvedValue(mockCreatedBusiness);

      const result = await service.create(createData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(createData.name);
      expect(result.description).toBe(createData.description);
      expect(result.contact.email).toBe(createData.contact.email);
      expect(result.address.street).toBe(createData.address.street);
      expect(result.categoryIds).toEqual(createData.categoryIds);
      expect(result.benefit).toBe(createData.benefit);
      expect(result.hasAccount).toBe(createData.hasAccount);
      expect(mockBusinessesRepository.create).toHaveBeenCalled();
    });

    it('should set status to PENDING by default', async () => {
      mockBusinessesRepository.create.mockResolvedValue(mockCreatedBusiness);

      const result = await service.create(createData);

      expect(result.status).toBe(BusinessStatus.PENDING);
    });

    it('should set status to ACTIVE when isAdmin is true', async () => {
      const adminCreateData = { ...createData, isAdmin: true };
      const adminBusiness = Business.create({
        ...mockCreatedBusiness,
        status: BusinessStatus.ACTIVE
      });
      mockBusinessesRepository.create.mockResolvedValue(adminBusiness);

      const result = await service.create(adminCreateData);

      expect(result.status).toBe(BusinessStatus.ACTIVE);
    });
  });

  describe('update', () => {
    const updateData = {
      name: 'Updated Restaurant',
      description: 'Updated description',
      openingHours: {
        monday: '10:00-22:00'
      }
    };

    const mockUpdatedBusiness = Business.create({
      name: updateData.name,
      description: updateData.description,
      contact: mockBusinessContact,
      address: mockBusinessAddress,
      categoryIds: ['category1'],
      keywordIds: ['keyword1'],
      openingHours: updateData.openingHours,
      benefit: '10% discount',
      hasAccount: true,
      status: BusinessStatus.ACTIVE
    });

    it('should update an existing business', async () => {
      mockBusinessesRepository.findById.mockResolvedValue(mockUpdatedBusiness);
      mockBusinessesRepository.update.mockResolvedValue(mockUpdatedBusiness);

      const result = await service.update('business1', updateData);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(result.openingHours).toEqual(updateData.openingHours);
      expect(mockBusinessesRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business not found', async () => {
      mockBusinessesRepository.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateData))
        .rejects
        .toThrow('Business not found');
    });
  });

  describe('delete', () => {
    it('should delete a business', async () => {
      mockBusinessesRepository.delete.mockResolvedValue(undefined);

      await service.delete('business1');

      expect(mockBusinessesRepository.delete).toHaveBeenCalledWith('business1');
    });
  });

  describe('getBusinessesByStatus', () => {
    const mockBusinesses = [
      Business.create({
        name: 'Restaurant A',
        description: 'A great restaurant',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['category1'],
        keywordIds: ['keyword1'],
        openingHours: {
          monday: '09:00-22:00'
        },
        benefit: '10% discount',
        hasAccount: true,
        status: BusinessStatus.ACTIVE
      })
    ];

    it('should return businesses by status', async () => {
      mockBusinessesRepository.findByStatusAndHasAccount.mockResolvedValue(mockBusinesses);

      const result = await service.getBusinessesByStatus({
        hasAccount: true,
        status: BusinessStatus.ACTIVE
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Restaurant A');
      expect(mockBusinessesRepository.findByStatusAndHasAccount).toHaveBeenCalledWith(
        BusinessStatus.ACTIVE,
        true
      );
    });
  });
}); 