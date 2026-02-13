import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EasterEggHuntService } from './easter-egg-hunt.service';
import { EASTER_EGG_REPOSITORY } from '../../domain/repositories/easter-egg.repository';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';

describe('EasterEggHuntService', () => {
  let service: EasterEggHuntService;
  let mockRepository: Record<string, jest.Mock>;
  let mockFirebaseService: Record<string, jest.Mock>;
  let mockUsersService: Record<string, jest.Mock>;
  let mockNotificationService: Record<string, jest.Mock>;

  const mockEggProps = {
    id: 'egg-1',
    title: 'Goldenes Ei',
    description: 'Am Hauptmarkt versteckt',
    imageUrl: 'https://example.com/egg.jpg',
    prizeDescription: '2x Kinogutscheine',
    numberOfWinners: 2,
    startDate: '2020-01-01',
    endDate: undefined,
    location: { address: 'Hauptmarkt 1, Nürnberg', latitude: 49.4539, longitude: 11.0775 },
    participants: ['user-1', 'user-2', 'user-3'],
    winners: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockEgg = EasterEgg.fromProps(mockEggProps);

  const mockFirestoreDoc = {
    exists: true,
    data: () => ({ isFeatureActive: true, startDate: '2026-03-28' }),
  };

  const mockDocRef = {
    get: jest.fn().mockResolvedValue(mockFirestoreDoc),
    set: jest.fn().mockResolvedValue(undefined),
  };

  const mockCollection = {
    doc: jest.fn().mockReturnValue(mockDocRef),
  };

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockCollection),
      }),
    };
    mockUsersService = {
      getUserProfile: jest.fn(),
    };
    mockNotificationService = {
      sendToUser: jest.fn().mockResolvedValue(undefined),
      sendToUsers: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EasterEggHuntService,
        { provide: EASTER_EGG_REPOSITORY, useValue: mockRepository },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();
    service = module.get<EasterEggHuntService>(EasterEggHuntService);
  });

  describe('getFeatureStatus', () => {
    it('should return feature status', async () => {
      const result = await service.getFeatureStatus();
      expect(result.isFeatureActive).toBe(true);
      expect(result.startDate).toBe('2026-03-28');
    });

    it('should return inactive when document does not exist', async () => {
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      const result = await service.getFeatureStatus();
      expect(result.isFeatureActive).toBe(false);
    });
  });

  describe('setFeatureStatus', () => {
    it('should set feature status', async () => {
      const result = await service.setFeatureStatus(true, '2026-03-28');
      expect(result.isFeatureActive).toBe(true);
      expect(result.startDate).toBe('2026-03-28');
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({ isFeatureActive: true, startDate: '2026-03-28' }),
        { merge: true },
      );
    });
  });

  describe('participate', () => {
    it('should allow participation', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com', userType: 'user' });
      const eggWithoutUser = EasterEgg.fromProps({ ...mockEggProps, participants: [] });
      mockRepository.findById.mockResolvedValue(eggWithoutUser);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      const result = await service.participate('egg-1', 'new-user');
      expect(result.participants).toContain('new-user');
    });

    it('should reject anonymous users (no profile)', async () => {
      mockUsersService.getUserProfile.mockResolvedValue(null);
      await expect(service.participate('egg-1', 'anonymous-user')).rejects.toThrow(ForbiddenException);
    });

    it('should reject when egg not found', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com' });
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.participate('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject when egg is not active', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com' });
      const futureEgg = EasterEgg.fromProps({ ...mockEggProps, startDate: '2099-01-01', participants: [] });
      mockRepository.findById.mockResolvedValue(futureEgg);
      await expect(service.participate('egg-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate participation', async () => {
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com' });
      mockRepository.findById.mockResolvedValue(mockEgg);
      await expect(service.participate('egg-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addWinner', () => {
    it('should add a winner', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com', notificationPreferences: {} });
      const result = await service.addWinner('egg-1', 'user-1');
      expect(result.winners).toContain('user-1');
    });

    it('should reject non-participant as winner', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      await expect(service.addWinner('egg-1', 'non-participant')).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate winner', async () => {
      const eggWithWinner = EasterEgg.fromProps({ ...mockEggProps, winners: ['user-1'] });
      mockRepository.findById.mockResolvedValue(eggWithWinner);
      await expect(service.addWinner('egg-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.addWinner('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('drawWinners', () => {
    it('should draw winners randomly', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      mockUsersService.getUserProfile.mockResolvedValue({ email: 'test@test.com', notificationPreferences: {} });
      const result = await service.drawWinners('egg-1');
      expect(result.winners.length).toBe(2);
    });

    it('should reject when no participants', async () => {
      const emptyEgg = EasterEgg.fromProps({ ...mockEggProps, participants: [] });
      mockRepository.findById.mockResolvedValue(emptyEgg);
      await expect(service.drawWinners('egg-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.drawWinners('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should reject when max winners already reached', async () => {
      const eggWithWinners = EasterEgg.fromProps({
        ...mockEggProps,
        numberOfWinners: 2,
        winners: ['user-1', 'user-2'],
      });
      mockRepository.findById.mockResolvedValue(eggWithWinners);
      await expect(service.drawWinners('egg-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getParticipants', () => {
    it('should return participants list', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      const result = await service.getParticipants('egg-1');
      expect(result).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.getParticipants('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const egg1 = EasterEgg.fromProps({
        ...mockEggProps,
        id: 'egg-1',
        participants: ['user-1', 'user-2'],
        winners: ['user-1'],
      });
      const egg2 = EasterEgg.fromProps({
        ...mockEggProps,
        id: 'egg-2',
        title: 'Silbernes Ei',
        participants: ['user-2', 'user-3'],
        winners: [],
      });
      mockRepository.findAll.mockResolvedValue([egg1, egg2]);
      const result = await service.getStatistics();
      expect(result.totalEggs).toBe(2);
      expect(result.totalParticipants).toBe(3);
      expect(result.totalWinners).toBe(1);
      expect(result.participantsPerEgg).toHaveLength(2);
    });
  });

  describe('sendWinnerNotification', () => {
    it('should send notification when preference is enabled', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      mockUsersService.getUserProfile.mockResolvedValue({
        email: 'test@test.com',
        notificationPreferences: { easterEggHuntWinner: true },
      });
      await service.addWinner('egg-1', 'user-1');
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          title: 'Du hast gewonnen!',
          data: expect.objectContaining({ type: 'EASTER_EGG_HUNT_WINNER' }),
        }),
      );
    });

    it('should not send notification when preference is disabled', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      mockUsersService.getUserProfile.mockResolvedValue({
        email: 'test@test.com',
        notificationPreferences: { easterEggHuntWinner: false },
      });
      await service.addWinner('egg-1', 'user-1');
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send notification when preference is undefined (default false)', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      mockUsersService.getUserProfile.mockResolvedValue({
        email: 'test@test.com',
        notificationPreferences: {},
      });
      await service.addWinner('egg-1', 'user-1');
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });
  });
});
