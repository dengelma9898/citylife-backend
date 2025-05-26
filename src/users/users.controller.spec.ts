import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { UserType } from './enums/user-type.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let firebaseStorageService: FirebaseStorageService;

  const mockUsersService = {
    getAll: jest.fn(),
    getBusinessUsersNeedsReview: jest.fn(),
    getBusinessUsersNeedsReviewCount: jest.fn(),
    getById: jest.fn(),
    createUserProfile: jest.fn(),
    createBusinessUser: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateBusinessUser: jest.fn(),
    deleteBusinessUser: jest.fn(),
    toggleFavoriteEvent: jest.fn(),
    toggleFavoriteBusiness: jest.fn(),
    getUserProfile: jest.fn(),
    getBusinessUser: jest.fn(),
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    firebaseStorageService = module.get<FirebaseStorageService>(FirebaseStorageService);

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return an array of users', async () => {
      mockUsersService.getAll.mockResolvedValue([mockUserProfile]);

      const result = await controller.getAll();

      expect(result).toEqual([mockUserProfile]);
      expect(usersService.getAll).toHaveBeenCalled();
    });
  });

  describe('getBusinessUsersNeedsReview', () => {
    it('should return business users that need review', async () => {
      mockUsersService.getBusinessUsersNeedsReview.mockResolvedValue([mockBusinessUser]);

      const result = await controller.getBusinessUsersNeedsReview();

      expect(result).toEqual([mockBusinessUser]);
      expect(usersService.getBusinessUsersNeedsReview).toHaveBeenCalled();
    });
  });

  describe('getPendingBusinessUserReviewsCount', () => {
    it('should return count of business users that need review', async () => {
      mockUsersService.getBusinessUsersNeedsReviewCount.mockResolvedValue(5);

      const result = await controller.getPendingBusinessUserReviewsCount();

      expect(result).toEqual({ count: 5 });
      expect(usersService.getBusinessUsersNeedsReviewCount).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return a user profile', async () => {
      mockUsersService.getById.mockResolvedValue(mockUserProfile);

      const result = await controller.getProfile('user1');

      expect(result).toEqual(mockUserProfile);
      expect(usersService.getById).toHaveBeenCalledWith('user1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getById.mockResolvedValue(null);

      await expect(controller.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
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

      mockUsersService.createUserProfile.mockResolvedValue({
        ...mockUserProfile,
        ...createDto,
      });

      const result = await controller.createUserProfile('user1', createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(usersService.createUserProfile).toHaveBeenCalledWith('user1', createDto);
    });
  });

  describe('createBusinessProfile', () => {
    it('should create a new business profile', async () => {
      const createDto: CreateBusinessUserDto = {
        userId: 'business1',
        email: 'business@example.com',
        businessId: 'business1',
        needsReview: false,
      };

      mockUsersService.createBusinessUser.mockResolvedValue(mockBusinessUser);

      const result = await controller.createBusinessProfile('business1', createDto);

      expect(result).toEqual(mockBusinessUser);
      expect(usersService.createBusinessUser).toHaveBeenCalledWith(createDto);
    });
  });

  describe('updateProfile', () => {
    it('should update a user profile', async () => {
      const updateDto = {
        name: 'Updated User',
      };

      mockUsersService.update.mockResolvedValue({
        ...mockUserProfile,
        ...updateDto,
      });

      const result = await controller.updateProfile('user1', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(usersService.update).toHaveBeenCalledWith('user1', updateDto);
    });
  });

  describe('deleteProfile', () => {
    it('should delete a user profile', async () => {
      await controller.deleteProfile('user1');

      expect(usersService.delete).toHaveBeenCalledWith('user1');
    });
  });

  describe('updateNeedsReview', () => {
    it('should update needsReview status', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);
      mockUsersService.updateBusinessUser.mockResolvedValue({
        ...mockBusinessUser,
        needsReview: true,
      });

      const result = await controller.updateNeedsReview('business1', true);

      expect(result.needsReview).toBe(true);
      expect(usersService.updateBusinessUser).toHaveBeenCalledWith('business1', {
        needsReview: true,
      });
    });

    it('should throw BadRequestException if needsReview is not a boolean', async () => {
      // @ts-expect-error - Testing invalid input
      await expect(controller.updateNeedsReview('business1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if business user not found', async () => {
      mockUsersService.getBusinessUser.mockResolvedValue(null);

      await expect(controller.updateNeedsReview('nonexistent', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFavoriteEvent', () => {
    it('should toggle favorite event', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockUsersService.toggleFavoriteEvent.mockResolvedValue(true);

      const result = await controller.toggleFavoriteEvent('user1', 'event1');

      expect(result).toEqual({ added: true });
      expect(usersService.toggleFavoriteEvent).toHaveBeenCalledWith('user1', 'event1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);

      await expect(controller.toggleFavoriteEvent('nonexistent', 'event1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFavoriteBusiness', () => {
    it('should toggle favorite business', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockUsersService.toggleFavoriteBusiness.mockResolvedValue(true);

      const result = await controller.toggleFavoriteBusiness('user1', 'business1');

      expect(result).toEqual({ added: true });
      expect(usersService.toggleFavoriteBusiness).toHaveBeenCalledWith('user1', 'business1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);

      await expect(controller.toggleFavoriteBusiness('nonexistent', 'business1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFavoriteEvents', () => {
    it('should return favorite events', async () => {
      const mockProfile = {
        ...mockUserProfile,
        favoriteEventIds: ['event1', 'event2'],
      };
      mockUsersService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getFavoriteEvents('user1');

      expect(result).toEqual(['event1', 'event2']);
    });

    it('should return empty array if no favorites', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getFavoriteEvents('user1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);

      await expect(controller.getFavoriteEvents('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFavoriteBusinesses', () => {
    it('should return favorite businesses', async () => {
      const mockProfile = {
        ...mockUserProfile,
        favoriteBusinessIds: ['business1', 'business2'],
      };
      mockUsersService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await controller.getFavoriteBusinesses('user1');

      expect(result).toEqual(['business1', 'business2']);
    });

    it('should return empty array if no favorites', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getFavoriteBusinesses('user1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);

      await expect(controller.getFavoriteBusinesses('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserType', () => {
    it('should return user type for regular user', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getUserType('user1');

      expect(result).toEqual({ userType: UserType.USER });
    });

    it('should return user type for business user', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);
      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);

      const result = await controller.getUserType('business1');

      expect(result).toEqual({ userType: UserType.BUSINESS });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);
      mockUsersService.getBusinessUser.mockResolvedValue(null);

      await expect(controller.getUserType('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTypeOfUser', () => {
    it('should return user type string for regular user', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await controller.getTypeOfUser('user1');

      expect(result).toBe(UserType.USER);
    });

    it('should return user type string for business user', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);
      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);

      const result = await controller.getTypeOfUser('business1');

      expect(result).toBe(UserType.BUSINESS);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);
      mockUsersService.getBusinessUser.mockResolvedValue(null);

      await expect(controller.getTypeOfUser('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
