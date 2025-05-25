import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from '../services/businesses.service';
import { Business, BusinessAddress, BusinessContact } from '../../domain/entities/business.entity';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { UsersService } from '../../../users/users.service';

jest.mock('../../../firebase/firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  }))
}));

describe('BusinessesController', () => {
  let controller: BusinessesController;
  let service: BusinessesService;

  const mockBusinessesService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getBusinessesByStatus: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn()
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn()
  };

  const mockUsersService = {
    getBusinessUser: jest.fn(),
    addBusinessToUser: jest.fn()
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
      controllers: [BusinessesController],
      providers: [
        {
          provide: BusinessesService,
          useValue: mockBusinessesService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        }
      ],
    }).compile();

    controller = module.get<BusinessesController>(BusinessesController);
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
      mockBusinessesService.getAll.mockResolvedValue(mockBusinesses);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant A');
      expect(result[1].name).toBe('Shop B');
      expect(mockBusinessesService.getAll).toHaveBeenCalled();
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
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);

      const result = await controller.getById('business1');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Restaurant A');
      expect(mockBusinessesService.getById).toHaveBeenCalledWith('business1');
    });

    it('should throw NotFoundException if business not found', async () => {
      mockBusinessesService.getById.mockResolvedValue(null);

      await expect(controller.getById('nonexistent'))
        .rejects
        .toThrow('Business not found');
    });
  });

  describe('create', () => {
    const createDto = {
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
      name: createDto.name,
      description: createDto.description,
      contact: BusinessContact.create(createDto.contact),
      address: BusinessAddress.create(createDto.address),
      categoryIds: createDto.categoryIds,
      keywordIds: createDto.keywordIds,
      openingHours: createDto.openingHours,
      benefit: createDto.benefit,
      hasAccount: createDto.hasAccount,
      status: BusinessStatus.PENDING
    });

    it('should create a new business', async () => {
      mockBusinessesService.create.mockResolvedValue(mockCreatedBusiness);

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(result.contact.email).toBe(createDto.contact.email);
      expect(result.address.street).toBe(createDto.address.street);
      expect(result.categoryIds).toEqual(createDto.categoryIds);
      expect(result.benefit).toBe(createDto.benefit);
      expect(result.hasAccount).toBe(createDto.hasAccount);
      expect(mockBusinessesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Restaurant',
      description: 'Updated description',
      openingHours: {
        monday: '10:00-22:00'
      }
    };

    const mockUpdatedBusiness = Business.create({
      name: updateDto.name,
      description: updateDto.description,
      contact: mockBusinessContact,
      address: mockBusinessAddress,
      categoryIds: ['category1'],
      keywordIds: ['keyword1'],
      openingHours: updateDto.openingHours,
      benefit: '10% discount',
      hasAccount: true,
      status: BusinessStatus.ACTIVE
    });

    it('should update an existing business', async () => {
      mockBusinessesService.update.mockResolvedValue(mockUpdatedBusiness);

      const result = await controller.update('business1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(result.openingHours).toEqual(updateDto.openingHours);
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', updateDto);
    });
  });

  describe('uploadLogo', () => {
    const mockFile = {
      originalname: 'logo.png',
      buffer: Buffer.from('test')
    } as Express.Multer.File;

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

    it('should upload a logo for a business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://storage.googleapis.com/logo.png');
      mockBusinessesService.update.mockResolvedValue({
        ...mockBusiness,
        logoUrl: 'https://storage.googleapis.com/logo.png'
      });

      const result = await controller.uploadLogo('business1', mockFile);

      expect(result).toBeDefined();
      expect(result.logoUrl).toBe('https://storage.googleapis.com/logo.png');
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        logoUrl: 'https://storage.googleapis.com/logo.png'
      });
    });

    it('should delete old logo before uploading new one', async () => {
      const businessWithLogo = {
        ...mockBusiness,
        logoUrl: 'https://storage.googleapis.com/old-logo.png'
      };
      mockBusinessesService.getById.mockResolvedValue(businessWithLogo);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://storage.googleapis.com/new-logo.png');
      mockBusinessesService.update.mockResolvedValue({
        ...businessWithLogo,
        logoUrl: 'https://storage.googleapis.com/new-logo.png'
      });

      const result = await controller.uploadLogo('business1', mockFile);

      expect(result).toBeDefined();
      expect(result.logoUrl).toBe('https://storage.googleapis.com/new-logo.png');
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('https://storage.googleapis.com/old-logo.png');
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        logoUrl: 'https://storage.googleapis.com/new-logo.png'
      });
    });
  });

  describe('removeImage', () => {
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
      status: BusinessStatus.ACTIVE,
      imageUrls: ['https://storage.googleapis.com/image1.png', 'https://storage.googleapis.com/image2.png']
    });

    it('should remove an image from a business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockBusinessesService.update.mockResolvedValue({
        ...mockBusiness,
        imageUrls: ['https://storage.googleapis.com/image2.png']
      });

      const result = await controller.removeImage('business1', 'https://storage.googleapis.com/image1.png');

      expect(result).toBeDefined();
      expect(result.imageUrls).toHaveLength(1);
      expect(result.imageUrls).not.toContain('https://storage.googleapis.com/image1.png');
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('https://storage.googleapis.com/image1.png');
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        imageUrls: ['https://storage.googleapis.com/image2.png']
      });
    });

    it('should throw BadRequestException if image URL is not provided', async () => {
      await expect(controller.removeImage('business1', ''))
        .rejects
        .toThrow('Image URL is required');
    });

    it('should throw BadRequestException if image URL is not found in business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);

      await expect(controller.removeImage('business1', 'https://storage.googleapis.com/nonexistent.png'))
        .rejects
        .toThrow('Image URL not found in business');
    });
  });

  describe('getPendingApprovalsCount', () => {
    const mockPendingBusinesses = [
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
        status: BusinessStatus.PENDING
      })
    ];

    it('should return count of pending approvals', async () => {
      mockBusinessesService.getBusinessesByStatus.mockResolvedValue(mockPendingBusinesses);

      const result = await controller.getPendingApprovalsCount();

      expect(result).toBeDefined();
      expect(result.count).toBe(1);
      expect(mockBusinessesService.getBusinessesByStatus).toHaveBeenCalledWith({
        hasAccount: true,
        status: BusinessStatus.PENDING
      });
    });
  });
}); 