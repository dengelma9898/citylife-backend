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

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  runTransaction: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let firebaseService: FirebaseService;
  let eventsService: EventsService;
  let businessesService: BusinessesService;

  const mockFirebaseService = {
    getClientFirestore: jest.fn().mockReturnValue({}),
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
      const mockSnapshot = {
        docs: [{ data: () => mockUserProfile }],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUserProfile);
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getBusinessUsersNeedsReview', () => {
    it('should return business users that need review', async () => {
      const mockSnapshot = {
        docs: [{ id: 'business1', data: () => mockBusinessUser }],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      mockBusinessesService.getById.mockResolvedValue({ name: 'Test Business' });

      const result = await service.getBusinessUsersNeedsReview();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('business1');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getBusinessUsersNeedsReviewCount', () => {
    it('should return count of business users that need review', async () => {
      const mockSnapshot = {
        docs: [
          { data: () => ({ needsReview: true, isDeleted: false }) },
          { data: () => ({ needsReview: true, isDeleted: false }) },
        ],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.getBusinessUsersNeedsReviewCount();

      expect(result).toBe(2);
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a user profile', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => mockUserProfile,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.getById('user1');

      expect(result).toEqual(mockUserProfile);
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return a business user', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'business1',
        data: () => mockBusinessUser,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.getById('business1');

      expect(result).toEqual({ ...mockBusinessUser, id: 'business1' });
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null if user not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

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

      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createUserProfile('user1', createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.userType).toBe(UserType.USER);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user profile', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => mockUserProfile,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updateData = {
        name: 'Updated User',
      };

      const result = await service.update('user1', updateData);

      expect(result).toBeDefined();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a user profile', async () => {
      const mockDoc = {
        exists: () => true,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.delete('user1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

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

      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBusinessUser(createDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('updateBusinessUser', () => {
    it('should update a business user', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'business1',
        data: () => mockBusinessUser,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updateData = {
        needsReview: true,
      };

      const result = await service.updateBusinessUser('business1', updateData);

      expect(result).toBeDefined();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business user not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.updateBusinessUser('nonexistent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteBusinessUser', () => {
    it('should delete a business user and set associated businesses to INACTIVE', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => mockBusinessUser,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation(async (db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({ exists: () => true }),
          update: jest.fn(),
          delete: jest.fn(),
        };
        await updateFunction(transaction);
      });

      await service.deleteBusinessUser('business1');

      expect(runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if business user not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.deleteBusinessUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleFavoriteEvent', () => {
    it('should add event to favorites if not present', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          favoriteEventIds: [],
        }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.toggleFavoriteEvent('user1', 'event1');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should remove event from favorites if present', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          favoriteEventIds: ['event1'],
        }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.toggleFavoriteEvent('user1', 'event1');

      expect(result).toBe(false);
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('toggleFavoriteBusiness', () => {
    it('should add business to favorites if not present', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          favoriteBusinessIds: [],
        }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.toggleFavoriteBusiness('user1', 'business1');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should remove business from favorites if present', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({
          ...mockUserProfile,
          favoriteBusinessIds: ['business1'],
        }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.toggleFavoriteBusiness('user1', 'business1');

      expect(result).toBe(false);
      expect(updateDoc).toHaveBeenCalled();
    });
  });
});
