import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from '../services/businesses.service';
import { BusinessEventsSettingsService } from '../services/business-events-settings.service';
import { Business, BusinessAddress, BusinessContact } from '../../interfaces/business.interface';
import { BusinessEventsSettings } from '../../interfaces/business-events-settings.interface';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { UsersService } from '../../../users/users.service';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { ROLES_KEY } from '../../../core/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { UserType } from '../../../users/enums/user-type.enum';

jest.mock('../../../firebase/firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn(),
  })),
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
    getBusinessesByStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockFirebaseService = {
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn(),
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockUsersService = {
    getBusinessUser: jest.fn(),
    getUserProfile: jest.fn(),
    addBusinessToUser: jest.fn(),
  };

  const mockReq = (uid = 'business-user-1') => ({ user: { uid } });

  const mockBusinessEventsSettingsService = {
    getSettings: jest.fn(),
    isFeatureEnabled: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockBusinessContact: BusinessContact = {
    email: 'contact@business.com',
    phoneNumber: '+49123456789',
    website: 'https://business.com',
  };

  const mockBusinessAddress: BusinessAddress = {
    street: 'Main Street',
    houseNumber: '123',
    postalCode: '90402',
    city: 'Nürnberg',
    latitude: 49.4521,
    longitude: 11.0767,
  };

  const createMockBusiness = (overrides: Partial<Business> = {}): Business => ({
    id: 'business1',
    name: 'Restaurant A',
    description: 'A great restaurant',
    contact: mockBusinessContact,
    address: mockBusinessAddress,
    categoryIds: ['category1'],
    keywordIds: ['keyword1'],
    openingHours: { monday: '09:00-22:00' },
    benefit: '10% discount',
    hasAccount: true,
    status: BusinessStatus.ACTIVE,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDeleted: false,
    customers: [],
    previousBenefits: [],
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessesController],
      providers: [
        {
          provide: BusinessesService,
          useValue: mockBusinessesService,
        },
        {
          provide: BusinessEventsSettingsService,
          useValue: mockBusinessEventsSettingsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BusinessesController>(BusinessesController);
    service = module.get<BusinessesService>(BusinessesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUsersService.getBusinessUser.mockResolvedValue({
      id: 'business-user-1',
      businessIds: ['business1'],
    });
    mockUsersService.getUserProfile.mockResolvedValue(null);
  });

  describe('getAll', () => {
    const mockBusinesses = [
      createMockBusiness({ id: 'business1', name: 'Restaurant A' }),
      createMockBusiness({
        id: 'business2',
        name: 'Shop B',
        description: 'A nice shop',
        categoryIds: ['category2'],
        keywordIds: ['keyword2'],
        openingHours: { monday: '10:00-20:00' },
        benefit: 'Free shipping',
      }),
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
    const mockBusiness = createMockBusiness();

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

      await expect(controller.getById('nonexistent')).rejects.toThrow('Business not found');
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Restaurant',
      description: 'A new restaurant',
      contact: {
        email: 'contact@newrestaurant.com',
        phoneNumber: '+49123456789',
        website: 'https://newrestaurant.com',
      },
      address: {
        street: 'New Street',
        houseNumber: '456',
        postalCode: '90403',
        city: 'Nürnberg',
        latitude: 49.4522,
        longitude: 11.0768,
      },
      openingHours: {
        monday: '08:00-23:00',
      },
      categoryIds: ['category1'],
      keywordIds: ['keyword1'],
      benefit: '15% discount',
      hasAccount: true,
    };

    const mockCreatedBusiness = createMockBusiness({
      id: 'new-business1',
      name: createDto.name,
      description: createDto.description,
      contact: createDto.contact,
      address: createDto.address,
      categoryIds: createDto.categoryIds,
      keywordIds: createDto.keywordIds,
      openingHours: createDto.openingHours,
      benefit: createDto.benefit,
      hasAccount: createDto.hasAccount,
      status: BusinessStatus.PENDING,
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
        monday: '10:00-22:00',
      },
    };

    const mockUpdatedBusiness = createMockBusiness({
      name: updateDto.name,
      description: updateDto.description,
      openingHours: updateDto.openingHours,
    });

    it('should update an existing business', async () => {
      mockBusinessesService.update.mockResolvedValue(mockUpdatedBusiness);

      const result = await controller.patchBusiness(mockReq(), 'business1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(result.openingHours).toEqual(updateDto.openingHours);
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', updateDto);
    });
  });

  describe('updateOpeningHours', () => {
    const mockBusiness = createMockBusiness({
      detailedOpeningHours: {
        Montag: [{ from: '08:00', to: '12:00' }],
      },
    });

    it('should update opening hours using structured DTO', async () => {
      const openingHoursData = {
        openingHours: { Montag: '09:00-18:00' },
        detailedOpeningHours: {
          Dienstag: [{ from: '10:00', to: '20:00' }],
        },
      };
      const expectedUpdate = {
        openingHours: { Montag: '09:00-18:00' },
        detailedOpeningHours: {
          Montag: [{ from: '08:00', to: '12:00' }],
          Dienstag: [{ from: '10:00', to: '20:00' }],
        },
      };
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockBusinessesService.update.mockResolvedValue({
        ...mockBusiness,
        ...expectedUpdate,
      });
      const result = await controller.updateOpeningHours(
        mockReq(),
        'business1',
        openingHoursData,
      );
      expect(result).toBeDefined();
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', expectedUpdate);
    });

    it('should transform legacy format and update business', async () => {
      const legacyData = {
        Montag: { '14:00': '18:00' },
      } as unknown as Parameters<typeof controller.updateOpeningHours>[2];
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockBusinessesService.update.mockResolvedValue(mockBusiness);
      await controller.updateOpeningHours(mockReq(), 'business1', legacyData);
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        detailedOpeningHours: {
          Montag: [
            { from: '08:00', to: '12:00' },
            { from: '14:00', to: '18:00' },
          ],
        },
      });
    });

    it('should throw NotFoundException when business does not exist', async () => {
      mockBusinessesService.getById.mockResolvedValue(null);
      await expect(
        controller.updateOpeningHours(mockReq(), 'business1', {}),
      ).rejects.toThrow('Business not found');
    });
  });

  describe('uploadLogo', () => {
    const mockFile = {
      originalname: 'logo.png',
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const mockBusiness = createMockBusiness();

    it('should upload a logo for a business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(
        'https://storage.googleapis.com/logo.png',
      );
      mockBusinessesService.update.mockResolvedValue({
        ...mockBusiness,
        logoUrl: 'https://storage.googleapis.com/logo.png',
      });

      const result = await controller.uploadLogo(mockReq(), 'business1', mockFile);

      expect(result).toBeDefined();
      expect(result.logoUrl).toBe('https://storage.googleapis.com/logo.png');
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        logoUrl: 'https://storage.googleapis.com/logo.png',
      });
    });

    it('should delete old logo before uploading new one', async () => {
      const businessWithLogo = {
        ...mockBusiness,
        logoUrl: 'https://storage.googleapis.com/old-logo.png',
      };
      mockBusinessesService.getById.mockResolvedValue(businessWithLogo);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(
        'https://storage.googleapis.com/new-logo.png',
      );
      mockBusinessesService.update.mockResolvedValue({
        ...businessWithLogo,
        logoUrl: 'https://storage.googleapis.com/new-logo.png',
      });

      const result = await controller.uploadLogo(mockReq(), 'business1', mockFile);

      expect(result).toBeDefined();
      expect(result.logoUrl).toBe('https://storage.googleapis.com/new-logo.png');
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.googleapis.com/old-logo.png',
      );
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        logoUrl: 'https://storage.googleapis.com/new-logo.png',
      });
    });
  });

  describe('removeImage', () => {
    const mockBusiness = createMockBusiness({
      imageUrls: [
        'https://storage.googleapis.com/image1.png',
        'https://storage.googleapis.com/image2.png',
      ],
    });

    it('should remove an image from a business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);
      mockBusinessesService.update.mockResolvedValue({
        ...mockBusiness,
        imageUrls: ['https://storage.googleapis.com/image2.png'],
      });

      const result = await controller.removeImage(
        mockReq(),
        'business1',
        'https://storage.googleapis.com/image1.png',
      );

      expect(result).toBeDefined();
      expect(result.imageUrls).toHaveLength(1);
      expect(result.imageUrls).not.toContain('https://storage.googleapis.com/image1.png');
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.googleapis.com/image1.png',
      );
      expect(mockBusinessesService.update).toHaveBeenCalledWith('business1', {
        imageUrls: ['https://storage.googleapis.com/image2.png'],
      });
    });

    it('should throw BadRequestException if image URL is not provided', async () => {
      await expect(controller.removeImage(mockReq(), 'business1', '')).rejects.toThrow(
        'Image URL is required',
      );
    });

    it('should throw BadRequestException if image URL is not found in business', async () => {
      mockBusinessesService.getById.mockResolvedValue(mockBusiness);

      await expect(
        controller.removeImage(
          mockReq(),
          'business1',
          'https://storage.googleapis.com/nonexistent.png',
        ),
      ).rejects.toThrow('Image URL not found in business');
    });
  });

  describe('getPendingApprovalsCount', () => {
    const mockPendingBusinesses = [
      ({
        name: 'Restaurant A',
        description: 'A great restaurant',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['category1'],
        keywordIds: ['keyword1'],
        openingHours: {
          monday: '09:00-22:00',
        },
        benefit: '10% discount',
        hasAccount: true,
        status: BusinessStatus.PENDING,
      }),
    ];

    it('should return count of pending approvals', async () => {
      mockBusinessesService.getBusinessesByStatus.mockResolvedValue(mockPendingBusinesses);

      const result = await controller.getPendingApprovalsCount();

      expect(result).toBeDefined();
      expect(result.count).toBe(1);
      expect(mockBusinessesService.getBusinessesByStatus).toHaveBeenCalledWith({
        hasAccount: true,
        status: BusinessStatus.PENDING,
      });
    });
  });

  describe('getBusinessEventsSettings', () => {
    const mockSettings = ({
      id: 'business_events_settings',
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    });

    it('should return current business events settings', async () => {
      mockBusinessEventsSettingsService.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getBusinessEventsSettings();

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockBusinessEventsSettingsService.getSettings).toHaveBeenCalled();
    });
  });

  describe('updateBusinessEventsSettings', () => {
    const mockSettings = ({
      id: 'business_events_settings',
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    });

    const updatedSettings = ({
      id: 'business_events_settings',
      isEnabled: false,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-1',
    });

    const mockRequest = {
      user: { uid: 'user-1' },
    };

    it('should update business events settings', async () => {
      mockBusinessEventsSettingsService.updateSettings.mockResolvedValue(updatedSettings);

      const result = await controller.updateBusinessEventsSettings(mockRequest, {
        isEnabled: false,
      });

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(false);
      expect(result.updatedBy).toBe('user-1');
      expect(mockBusinessEventsSettingsService.updateSettings).toHaveBeenCalledWith(
        false,
        'user-1',
      );
    });

    it('should update settings to enabled', async () => {
      const enabledSettings = ({
        id: 'business_events_settings',
        isEnabled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: 'user-1',
      });

      mockBusinessEventsSettingsService.updateSettings.mockResolvedValue(enabledSettings);

      const result = await controller.updateBusinessEventsSettings(mockRequest, {
        isEnabled: true,
      });

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockBusinessEventsSettingsService.updateSettings).toHaveBeenCalledWith(
        true,
        'user-1',
      );
    });
  });

  describe('business access verification', () => {
    it('should reject patchBusiness when user has no access to business', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue({
        id: 'other-user',
        businessIds: ['other-business'],
      });
      mockUsersService.getUserProfile.mockResolvedValue({
        userType: UserType.USER,
      });
      await expect(
        controller.patchBusiness(mockReq('other-user'), 'business1', { name: 'Hacked' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockBusinessesService.update).not.toHaveBeenCalled();
    });

    it('should allow patchBusiness for super_admin without business assignment', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue({
        userType: UserType.SUPER_ADMIN,
      });
      mockBusinessesService.update.mockResolvedValue(createMockBusiness({ name: 'Admin Updated' }));
      const result = await controller.patchBusiness(mockReq('admin1'), 'business1', {
        name: 'Admin Updated',
      });
      expect(result.name).toBe('Admin Updated');
      expect(mockBusinessesService.update).toHaveBeenCalled();
    });
  });

  describe('admin endpoint role metadata', () => {
    const reflector = new Reflector();

    it('should require super_admin for getPendingApprovalsCount', () => {
      const roles = reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        BusinessesController.prototype.getPendingApprovalsCount,
        BusinessesController,
      ]);
      expect(roles).toContain('super_admin');
    });
  });
});
