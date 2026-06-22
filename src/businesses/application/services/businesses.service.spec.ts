import { Test, TestingModule } from '@nestjs/testing';
import { BusinessesService } from './businesses.service';
import { UsersService } from '../../../users/users.service';
import { BusinessCategoriesService } from '../../../business-categories/application/services/business-categories.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  Business,
  BusinessAddress,
  BusinessContact,
  BusinessCustomer,
} from '../../domain/entities/business.entity';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { KeywordsService } from '../../../keywords/keywords.service';
import { EventsService } from '../../../events/events.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { PassScanService } from '../../../pass-stats/application/services/pass-scan.service';

describe('BusinessesService', () => {
  let service: BusinessesService;
  let mockDoc: {
    get: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockQuery: {
    where: jest.Mock;
    get: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    add: jest.Mock;
    get: jest.Mock;
    where: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };

  const mockUsersService = {
    getById: jest.fn(),
    getAllBusinessUsers: jest.fn(),
    getAllUserProfilesWithIds: jest.fn(),
  };

  const mockBusinessCategoriesService = {
    getById: jest.fn(),
  };

  const mockKeywordsService = {
    getById: jest.fn(),
  };

  const mockEventsService = {
    getById: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const mockPassScanService = {
    recordScanFromBusinessScan: jest.fn().mockResolvedValue(undefined),
  };

  const mockBusinessAddress = BusinessAddress.create({
    street: 'Main Street',
    houseNumber: '123',
    postalCode: '90402',
    city: 'Nürnberg',
    latitude: 49.4521,
    longitude: 11.0767,
  });

  const mockBusinessContact = BusinessContact.create({
    email: 'contact@business.com',
    phoneNumber: '+49123456789',
    website: 'https://business.com',
  });

  const toFirestoreDoc = (business: Business, id?: string) => {
    const json = business.toJSON();
    const docId = id || json.id;
    const { id: _id, ...data } = json;
    return {
      id: docId,
      data: () => data,
    };
  };

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn().mockResolvedValue({ exists: true, id: 'business1', data: () => ({}) }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'new-business-id' }),
      get: jest.fn().mockResolvedValue({ docs: [] }),
      where: jest.fn().mockReturnValue(mockQuery),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessesService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: BusinessCategoriesService, useValue: mockBusinessCategoriesService },
        { provide: KeywordsService, useValue: mockKeywordsService },
        { provide: EventsService, useValue: mockEventsService },
        {
          provide: FirebaseService,
          useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) },
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PassScanService, useValue: mockPassScanService },
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
          monday: '09:00-22:00',
        },
        benefit: '10% discount',
        hasAccount: true,
        status: BusinessStatus.ACTIVE,
      }),
      Business.create({
        name: 'Shop B',
        description: 'A nice shop',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['category2'],
        keywordIds: ['keyword2'],
        openingHours: {
          monday: '10:00-20:00',
        },
        benefit: 'Free shipping',
        hasAccount: true,
        status: BusinessStatus.ACTIVE,
      }),
    ];

    it('should return all businesses', async () => {
      mockCollection.get.mockResolvedValue({
        docs: [
          toFirestoreDoc(mockBusinesses[0], 'business-1'),
          toFirestoreDoc(mockBusinesses[1], 'business-2'),
        ],
      });
      const result = await service.getAll();
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Restaurant A');
      expect(result[1].name).toBe('Shop B');
      expect(mockCollection.get).toHaveBeenCalled();
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
        monday: '09:00-22:00',
      },
      benefit: '10% discount',
      hasAccount: true,
      status: BusinessStatus.ACTIVE,
    });

    it('should return a business by id', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(mockBusiness, 'business1').data(),
      });
      const result = await service.getById('business1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('business1');
      expect(result?.name).toBe('Restaurant A');
      expect(mockCollection.doc).toHaveBeenCalledWith('business1');
    });

    it('should return null if business not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      const result = await service.getById('nonexistent');
      expect(result).toBeNull();
      expect(mockCollection.doc).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    const createData = {
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

    it('should create a new business', async () => {
      mockCollection.add.mockResolvedValue({ id: 'new-business-id' });
      const result = await service.create(createData);
      expect(result).toBeDefined();
      expect(result.id).toBe('new-business-id');
      expect(result.name).toBe(createData.name);
      expect(result.description).toBe(createData.description);
      expect(result.contact.email).toBe(createData.contact.email);
      expect(result.address.street).toBe(createData.address.street);
      expect(result.categoryIds).toEqual(createData.categoryIds);
      expect(result.benefit).toBe(createData.benefit);
      expect(result.hasAccount).toBe(createData.hasAccount);
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should set status to PENDING by default', async () => {
      mockCollection.add.mockResolvedValue({ id: 'new-business-id' });
      const result = await service.create(createData);
      expect(result.status).toBe(BusinessStatus.PENDING);
    });

    it('should set status to ACTIVE when isAdmin is true', async () => {
      const adminCreateData = { ...createData, isAdmin: true };
      mockCollection.add.mockResolvedValue({ id: 'admin-business-id' });
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      const result = await service.create(adminCreateData);
      expect(result.status).toBe(BusinessStatus.ACTIVE);
    });
  });

  describe('update', () => {
    const updateData = {
      name: 'Updated Restaurant',
      description: 'Updated description',
      openingHours: {
        monday: '10:00-22:00',
      },
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
      status: BusinessStatus.ACTIVE,
    });

    it('should update an existing business', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(mockUpdatedBusiness, 'business1').data(),
      });
      const result = await service.update('business1', updateData);
      expect(result).toBeDefined();
      expect(result.id).toBe('business1');
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(result.openingHours).toEqual(updateData.openingHours);
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.update('nonexistent', updateData)).rejects.toThrow('Business not found');
    });
  });

  describe('delete', () => {
    it('should delete a business', async () => {
      mockDoc.get.mockResolvedValue({ exists: true });
      await service.delete('business1');
      expect(mockCollection.doc).toHaveBeenCalledWith('business1');
      expect(mockDoc.delete).toHaveBeenCalled();
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
          monday: '09:00-22:00',
        },
        benefit: '10% discount',
        hasAccount: true,
        status: BusinessStatus.ACTIVE,
      }),
    ];

    it('should return businesses by status', async () => {
      mockQuery.get.mockResolvedValue({
        docs: [toFirestoreDoc(mockBusinesses[0], 'business-1')],
      });
      const result = await service.getBusinessesByStatus({
        hasAccount: true,
        status: BusinessStatus.ACTIVE,
      });
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Restaurant A');
      expect(mockCollection.where).toHaveBeenCalledWith('status', '==', BusinessStatus.ACTIVE);
      expect(mockQuery.where).toHaveBeenCalledWith('hasAccount', '==', true);
    });
  });

  describe('updateStatus', () => {
    const mockBusiness = Business.create({
      name: 'Test Business',
      description: 'A test business',
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
    });

    const mockUpdatedBusiness = Business.create({
      ...mockBusiness,
      status: BusinessStatus.ACTIVE,
    });

    it('should update business status', async () => {
      const businessWithId = Business.fromProps({
        ...mockBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(businessWithId, 'business1').data(),
      });
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([]);
      const result = await service.updateStatus('business1', BusinessStatus.ACTIVE);
      expect(result).toBeDefined();
      expect(result.status).toBe(BusinessStatus.ACTIVE);
      expect(mockCollection.doc).toHaveBeenCalledWith('business1');
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should send business activated notification when status changes from PENDING to ACTIVE', async () => {
      const mockBusinessWithId = Business.fromProps({
        ...mockBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(mockBusinessWithId, 'business1').data(),
      });
      const mockBusinessUser = {
        id: 'business-user-1',
        email: 'business@example.com',
        businessIds: ['business1'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false,
        needsReview: false,
        notificationPreferences: {
          businessActivated: true,
        },
      };
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([mockBusinessUser]);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      await service.updateStatus('business1', BusinessStatus.ACTIVE);
      expect(mockUsersService.getAllBusinessUsers).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('business-user-1', {
        title: 'Dein Business ist jetzt aktiv',
        body: 'Test Business wurde freigeschaltet und ist jetzt sichtbar',
        data: {
          type: 'BUSINESS_ACTIVATED',
          businessId: 'business1',
          businessName: 'Test Business',
          previousStatus: 'PENDING',
          newStatus: 'ACTIVE',
        },
      });
    });

    it('should not send business activated notification when preference is disabled', async () => {
      const businessWithId = Business.fromProps({
        ...mockBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(businessWithId, 'business1').data(),
      });
      const mockBusinessUser = {
        id: 'business-user-1',
        email: 'business@example.com',
        businessIds: ['business1'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false,
        needsReview: false,
        notificationPreferences: {
          businessActivated: false,
        },
      };
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([mockBusinessUser]);
      await service.updateStatus('business1', BusinessStatus.ACTIVE);
      expect(mockUsersService.getAllBusinessUsers).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send business activated notification when preference is undefined (default false)', async () => {
      const businessWithId = Business.fromProps({
        ...mockBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(businessWithId, 'business1').data(),
      });
      const mockBusinessUser = {
        id: 'business-user-1',
        email: 'business@example.com',
        businessIds: ['business1'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false,
        needsReview: false,
      };
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([mockBusinessUser]);
      await service.updateStatus('business1', BusinessStatus.ACTIVE);
      expect(mockUsersService.getAllBusinessUsers).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should only send notification to business users with matching businessId', async () => {
      const mockBusinessWithId = Business.fromProps({
        ...mockBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(mockBusinessWithId, 'business1').data(),
      });
      const mockBusinessUser1 = {
        id: 'business-user-1',
        email: 'business1@example.com',
        businessIds: ['business1'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false,
        needsReview: false,
        notificationPreferences: {
          businessActivated: true,
        },
      };
      const mockBusinessUser2 = {
        id: 'business-user-2',
        email: 'business2@example.com',
        businessIds: ['business2'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        isDeleted: false,
        needsReview: false,
        notificationPreferences: {
          businessActivated: true,
        },
      };
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([
        mockBusinessUser1,
        mockBusinessUser2,
      ]);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      await service.updateStatus('business1', BusinessStatus.ACTIVE);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('business-user-1', expect.any(Object));
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalledWith('business-user-2', expect.any(Object));
    });

    it('should not send notification for other status changes', async () => {
      const mockActiveBusiness = Business.create({
        ...mockBusiness,
        status: BusinessStatus.ACTIVE,
      });
      const mockInactiveBusiness = Business.create({
        ...mockActiveBusiness,
        status: BusinessStatus.INACTIVE,
      });
      const activeWithId = Business.fromProps({
        ...mockActiveBusiness.toJSON(),
        id: 'business1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business1',
        data: () => toFirestoreDoc(activeWithId, 'business1').data(),
      });
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);
      mockUsersService.getAllBusinessUsers.mockResolvedValue([]);
      await service.updateStatus('business1', BusinessStatus.INACTIVE);
      expect(mockUsersService.getAllBusinessUsers).not.toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });
  });

  describe('addCustomerScan', () => {
    it('should persist business scan and record pass scan for user', async () => {
      const existingBusiness = Business.create({
        name: 'Scan Business',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['cat-1'],
        keywordIds: [],
        description: 'desc',
        status: BusinessStatus.ACTIVE,
        benefit: '10% Rabatt',
        hasAccount: true,
      });
      const businessWithId = Business.fromProps({
        ...existingBusiness.toJSON(),
        id: 'business-scan-1',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business-scan-1',
        data: () => toFirestoreDoc(businessWithId, 'business-scan-1').data(),
      });
      const result = await service.addCustomerScan('business-scan-1', {
        customerId: 'NSP-user-1',
        userId: 'user-1',
        price: 50,
      });
      expect(result.id).toBe('business-scan-1');
      expect(result.customers).toHaveLength(1);
      expect(mockPassScanService.recordScanFromBusinessScan).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: 'business-scan-1',
          businessName: 'Scan Business',
        }),
      );
    });

    it('should still return business when pass scan recording fails', async () => {
      const existingBusiness = Business.create({
        name: 'Scan Business',
        contact: mockBusinessContact,
        address: mockBusinessAddress,
        categoryIds: ['cat-1'],
        keywordIds: [],
        description: 'desc',
        status: BusinessStatus.ACTIVE,
        benefit: '10% Rabatt',
        hasAccount: true,
      });
      const businessWithId = Business.fromProps({
        ...existingBusiness.toJSON(),
        id: 'business-scan-2',
      });
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'business-scan-2',
        data: () => toFirestoreDoc(businessWithId, 'business-scan-2').data(),
      });
      mockPassScanService.recordScanFromBusinessScan.mockRejectedValue(new Error('firestore error'));
      const result = await service.addCustomerScan('business-scan-2', {
        customerId: 'NSP-user-2',
        userId: 'user-2',
      });
      expect(result.id).toBe('business-scan-2');
      expect(result.customers).toHaveLength(1);
    });
  });
});
