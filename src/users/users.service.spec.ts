import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { FirebaseService } from '../firebase/firebase.service';
import { EventsService } from '../events/events.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { UserProfile } from './interfaces/user-profile.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { UserType } from './enums/user-type.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BusinessStatus } from '../businesses/interfaces/business.interface';

describe('UsersService', () => {
  let service: UsersService;
  let firebaseService: FirebaseService;
  let eventsService: EventsService;
  let businessesService: BusinessesService;

  const createFirestoreMock = (mockData: any = {}) => {
    const mockDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: 'user1', data: () => mockData }],
      }),
    };

    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnValue(mockQuery),
      get: jest.fn().mockResolvedValue({
        docs: [{ data: () => mockData }],
      }),
    };

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
      runTransaction: jest.fn().mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockData,
          }),
          set: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          delete: jest.fn().mockReturnThis(),
        };
        return callback(transaction);
      }),
    };
  };

  const mockFirebaseService = {
    getFirestore: jest.fn().mockReturnValue(createFirestoreMock()),
  };

  const mockEventsService = {
    getById: jest.fn(),
  };

  const mockBusinessesService = {
    getById: jest.fn(),
  };

  const mockUserProfile: UserProfile = {
    name: 'Test User',
    email: 'test@example.com',
    userType: UserType.USER,
    managementId: 'mgmt1',
    customerId: 'NSP-user1',
    memberSince: '2024-1',
    businessHistory: [],
    preferences: [],
    language: 'de',
    livingInCitySinceYear: 2020,
  };

  const mockBusinessUser: BusinessUser = {
    id: 'business1',
    email: 'business@example.com',
    businessIds: ['business1'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    isDeleted: false,
    needsReview: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
        {
          provide: BusinessesService,
          useValue: mockBusinessesService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    eventsService = module.get<EventsService>(EventsService);
    businessesService = module.get<BusinessesService>(BusinessesService);

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return an array of users', async () => {
      mockFirebaseService.getFirestore.mockReturnValue(createFirestoreMock(mockUserProfile));

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUserProfile);
    });
  });

  describe('getBusinessUsersNeedsReview', () => {
    it('should return business users that need review', async () => {
      mockFirebaseService.getFirestore.mockReturnValue(createFirestoreMock(mockBusinessUser));
      mockBusinessesService.getById.mockResolvedValue({ name: 'Test Business' });

      const result = await service.getBusinessUsersNeedsReview();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('business1');
    });
  });

  describe('getBusinessUsersNeedsReviewCount', () => {
    it('should return count of business users that need review', async () => {
      const mockData = { needsReview: true, isDeleted: false };
      mockFirebaseService.getFirestore.mockReturnValue(createFirestoreMock(mockData));

      const result = await service.getBusinessUsersNeedsReviewCount();

      expect(result).toBe(1);
    });
  });

  describe('getById', () => {
    it('should return a user profile', async () => {
      mockFirebaseService.getFirestore.mockReturnValue(createFirestoreMock(mockUserProfile));

      const result = await service.getById('user1');

      expect(result).toEqual(mockUserProfile);
    });

    it('should return a business user', async () => {
      mockFirebaseService.getFirestore.mockReturnValue(createFirestoreMock(mockBusinessUser));

      const result = await service.getById('business1');

      expect(result).toEqual({ ...mockBusinessUser, id: 'business1' });
    });

    it('should return null if user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('should create a new user profile', async () => {
      const createDto: CreateUserProfileDto = {
        name: 'New User',
        email: 'new@example.com',
        preferences: [],
        language: 'de',
        livingInCitySinceYear: 2020,
      };

      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.createUserProfile('user1', createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.userType).toBe(UserType.USER);
      expect(mockFirestore.collection().doc().set).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user profile', async () => {
      const mockFirestore = createFirestoreMock(mockUserProfile);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateData = {
        name: 'Updated User',
      };

      const result = await service.update('user1', updateData);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a user profile', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.delete('user1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBusinessUser', () => {
    it('should create a new business user', async () => {
      const createDto: CreateBusinessUserDto = {
        userId: 'business1',
        email: 'business@example.com',
        businessId: 'business1',
        needsReview: false,
      };

      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.createBusinessUser(createDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(mockFirestore.collection().doc().set).toHaveBeenCalled();
    });
  });

  describe('updateBusinessUser', () => {
    it('should update a business user', async () => {
      const mockFirestore = createFirestoreMock(mockBusinessUser);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateData = {
        needsReview: true,
      };

      const result = await service.updateBusinessUser('business1', updateData);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.updateBusinessUser('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteBusinessUser', () => {
    it('should delete a business user', async () => {
      const mockFirestore = createFirestoreMock(mockBusinessUser);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.deleteBusinessUser('user1');

      expect(mockFirestore.batch().delete).toHaveBeenCalled();
      expect(mockFirestore.batch().commit).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business user not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.deleteBusinessUser('nonexistent')).rejects.toThrow(
        new Error('Failed to delete business user: Business user not found'),
      );
    });
  });

  describe('toggleFavoriteEvent', () => {
    it('should add event to favorites if not present', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockUserProfile,
        favoriteEventIds: [],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.toggleFavoriteEvent('user1', 'event1');

      expect(result).toBe(true);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should remove event from favorites if present', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockUserProfile,
        favoriteEventIds: ['event1'],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.toggleFavoriteEvent('user1', 'event1');

      expect(result).toBe(false);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });
  });

  describe('toggleFavoriteBusiness', () => {
    it('should remove business from favorites if present', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockUserProfile,
        favoriteBusinessIds: ['business1'],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.toggleFavoriteBusiness('user1', 'business1');

      expect(result).toBe(false);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should add business to favorites if not present', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockUserProfile,
        favoriteBusinessIds: ['business1'],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.toggleFavoriteBusiness('user1', 'business2');

      expect(result).toBe(true);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });
  });

  describe('getUserProfileByCustomerId', () => {
    it('should return user profile by customerId', async () => {
      const mockFirestore = createFirestoreMock(mockUserProfile);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getUserProfileByCustomerId('NSP-user1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user1');
      expect(result?.profile).toEqual(mockUserProfile);
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('customerId', '==', 'NSP-user1');
    });

    it('should return null if user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().where().limit().get.mockResolvedValue({ empty: true, docs: [] });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getUserProfileByCustomerId('NSP-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('blockUser', () => {
    it('should block a user with reason', async () => {
      const mockFirestore = createFirestoreMock(mockUserProfile);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.blockUser('NSP-user1', true, 'Verstoß gegen Nutzungsbedingungen');

      expect(result).toBeDefined();
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('customerId', '==', 'NSP-user1');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('user1');
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
      const updateCall = mockFirestore.collection().doc().update.mock.calls[0][0];
      expect(updateCall.isBlocked).toBe(true);
      expect(updateCall.blockReason).toBe('Verstoß gegen Nutzungsbedingungen');
      expect(updateCall.blockedAt).toBeDefined();
    });

    it('should block a user without reason', async () => {
      const mockFirestore = createFirestoreMock(mockUserProfile);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.blockUser('NSP-user1', true);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('customerId', '==', 'NSP-user1');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('user1');
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
      const updateCall = mockFirestore.collection().doc().update.mock.calls[0][0];
      expect(updateCall.isBlocked).toBe(true);
      expect(updateCall.blockReason).toBeNull();
      expect(updateCall.blockedAt).toBeDefined();
    });

    it('should unblock a user', async () => {
      const blockedUserProfile = {
        ...mockUserProfile,
        isBlocked: true,
        blockedAt: '2024-01-01T00:00:00.000Z',
        blockReason: 'Test reason',
      };
      const mockFirestore = createFirestoreMock(blockedUserProfile);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.blockUser('NSP-user1', false);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().where).toHaveBeenCalledWith('customerId', '==', 'NSP-user1');
      expect(mockFirestore.collection().doc).toHaveBeenCalledWith('user1');
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
      const updateCall = mockFirestore.collection().doc().update.mock.calls[0][0];
      expect(updateCall.isBlocked).toBe(false);
      expect(updateCall.blockReason).toBeNull();
      expect(updateCall.blockedAt).toBeNull();
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().where().limit().get.mockResolvedValue({ empty: true, docs: [] });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.blockUser('NSP-nonexistent', true)).rejects.toThrow(NotFoundException);
    });
  });
});
