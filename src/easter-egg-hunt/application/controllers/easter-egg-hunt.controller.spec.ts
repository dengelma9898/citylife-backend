import { Test, TestingModule } from '@nestjs/testing';
import { EasterEggHuntController } from './easter-egg-hunt.controller';
import { EasterEggHuntService } from '../services/easter-egg-hunt.service';
import { EasterEggService } from '../services/easter-egg.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';
import { UsersService } from '../../../users/users.service';

describe('EasterEggHuntController', () => {
  let controller: EasterEggHuntController;
  let mockEasterEggHuntService: Record<string, jest.Mock>;
  let mockEasterEggService: Record<string, jest.Mock>;
  let mockFirebaseStorageService: Record<string, jest.Mock>;

  const mockEggProps = {
    id: 'egg-1',
    title: 'Goldenes Ei',
    description: 'Am Hauptmarkt versteckt',
    imageUrl: 'https://example.com/egg.jpg',
    prizeDescription: '2x Kinogutscheine',
    numberOfWinners: 1,
    startDate: '2026-03-28',
    endDate: '2026-04-06',
    location: { address: 'Hauptmarkt 1, Nürnberg', latitude: 49.4539, longitude: 11.0775 },
    participants: ['user-1'],
    winners: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockEgg = EasterEgg.fromProps(mockEggProps);

  beforeEach(async () => {
    mockEasterEggHuntService = {
      getFeatureStatus: jest.fn(),
      setFeatureStatus: jest.fn(),
      isFeatureActive: jest.fn(),
      participate: jest.fn(),
      addWinner: jest.fn(),
      drawWinners: jest.fn(),
      getParticipants: jest.fn(),
      getStatistics: jest.fn(),
    };
    mockEasterEggService = {
      getAll: jest.fn(),
      getActive: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateImageUrl: jest.fn(),
      delete: jest.fn(),
    };
    mockFirebaseStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EasterEggHuntController],
      providers: [
        { provide: EasterEggHuntService, useValue: mockEasterEggHuntService },
        { provide: EasterEggService, useValue: mockEasterEggService },
        { provide: FirebaseStorageService, useValue: mockFirebaseStorageService },
        { provide: UsersService, useValue: { getUserProfile: jest.fn() } },
      ],
    }).compile();
    controller = module.get<EasterEggHuntController>(EasterEggHuntController);
  });

  describe('getFeatureStatus', () => {
    it('should return feature status', async () => {
      const status = { isFeatureActive: true, startDate: '2026-03-28' };
      mockEasterEggHuntService.getFeatureStatus.mockResolvedValue(status);
      const result = await controller.getFeatureStatus();
      expect(result).toEqual(status);
    });
  });

  describe('setFeatureStatus', () => {
    it('should set feature status', async () => {
      const status = { isFeatureActive: true, startDate: '2026-03-28' };
      mockEasterEggHuntService.setFeatureStatus.mockResolvedValue(status);
      const result = await controller.setFeatureStatus({ isFeatureActive: true, startDate: '2026-03-28' });
      expect(result).toEqual(status);
    });
  });

  describe('getAll', () => {
    it('should return active eggs by default', async () => {
      mockEasterEggService.getActive.mockResolvedValue([mockEgg]);
      const result = await controller.getAll(undefined);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('egg-1');
      expect(result[0].participantCount).toBe(1);
      expect(mockEasterEggService.getActive).toHaveBeenCalled();
    });

    it('should return all eggs when activeOnly is false', async () => {
      mockEasterEggService.getAll.mockResolvedValue([mockEgg]);
      const result = await controller.getAll('false');
      expect(result).toHaveLength(1);
      expect(mockEasterEggService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return an egg', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      const result = await controller.getById('egg-1');
      expect(result.id).toBe('egg-1');
      expect(result.participantCount).toBe(1);
    });
  });

  describe('create', () => {
    it('should create an egg', async () => {
      mockEasterEggService.create.mockResolvedValue(mockEgg);
      const dto = {
        title: 'Goldenes Ei',
        description: 'Am Hauptmarkt versteckt',
        startDate: '2026-03-28',
        address: 'Hauptmarkt 1',
        latitude: 49.4539,
        longitude: 11.0775,
      };
      const result = await controller.create(dto);
      expect(result.id).toBe('egg-1');
    });
  });

  describe('update', () => {
    it('should update an egg', async () => {
      const updatedEgg = EasterEgg.fromProps({ ...mockEggProps, title: 'Aktualisiert' });
      mockEasterEggService.update.mockResolvedValue(updatedEgg);
      const result = await controller.update('egg-1', { title: 'Aktualisiert' });
      expect(result.title).toBe('Aktualisiert');
    });
  });

  describe('delete', () => {
    it('should delete an egg', async () => {
      mockEasterEggService.delete.mockResolvedValue(undefined);
      await controller.delete('egg-1');
      expect(mockEasterEggService.delete).toHaveBeenCalledWith('egg-1');
    });
  });

  describe('uploadImage', () => {
    it('should upload image and update egg', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/new.jpg');
      const updatedEgg = EasterEgg.fromProps({ ...mockEggProps, imageUrl: 'https://example.com/new.jpg' });
      mockEasterEggService.updateImageUrl.mockResolvedValue(updatedEgg);
      const file = { originalname: 'test.jpg', buffer: Buffer.from('test') } as Express.Multer.File;
      const result = await controller.uploadImage('egg-1', file);
      expect(result.imageUrl).toBe('https://example.com/new.jpg');
    });

    it('should delete old image before uploading new one', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      mockFirebaseStorageService.deleteFile.mockResolvedValue(undefined);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/new.jpg');
      const updatedEgg = EasterEgg.fromProps({ ...mockEggProps, imageUrl: 'https://example.com/new.jpg' });
      mockEasterEggService.updateImageUrl.mockResolvedValue(updatedEgg);
      const file = { originalname: 'test.jpg', buffer: Buffer.from('test') } as Express.Multer.File;
      await controller.uploadImage('egg-1', file);
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('https://example.com/egg.jpg');
    });
  });

  describe('participate', () => {
    it('should participate in an egg', async () => {
      const updatedEgg = EasterEgg.fromProps({ ...mockEggProps, participants: ['user-1', 'new-user'] });
      mockEasterEggHuntService.participate.mockResolvedValue(updatedEgg);
      const result = await controller.participate('egg-1', 'new-user');
      expect(result.participantCount).toBe(2);
    });
  });

  describe('drawWinners', () => {
    it('should draw winners', async () => {
      const eggWithWinner = EasterEgg.fromProps({ ...mockEggProps, winners: ['user-1'] });
      mockEasterEggHuntService.drawWinners.mockResolvedValue(eggWithWinner);
      const result = await controller.drawWinners('egg-1');
      expect(result.winnerCount).toBe(1);
    });
  });

  describe('addWinner', () => {
    it('should add a winner', async () => {
      const eggWithWinner = EasterEgg.fromProps({ ...mockEggProps, winners: ['user-1'] });
      mockEasterEggHuntService.addWinner.mockResolvedValue(eggWithWinner);
      const result = await controller.addWinner('egg-1', { userId: 'user-1' });
      expect(result.winnerCount).toBe(1);
    });
  });

  describe('getParticipants', () => {
    it('should return participants list', async () => {
      mockEasterEggHuntService.getParticipants.mockResolvedValue(['user-1', 'user-2']);
      const result = await controller.getParticipants('egg-1');
      expect(result).toEqual(['user-1', 'user-2']);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      const stats = {
        totalEggs: 5,
        activeEggs: 3,
        totalParticipants: 50,
        totalWinners: 5,
        participantsPerEgg: [],
      };
      mockEasterEggHuntService.getStatistics.mockResolvedValue(stats);
      const result = await controller.getStatistics();
      expect(result.totalEggs).toBe(5);
    });
  });

  describe('response DTO mapping', () => {
    it('should not expose participants array, only count', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      const result = await controller.getById('egg-1', 'user-x');
      expect(result.participantCount).toBe(1);
      expect((result as any).participants).toBeUndefined();
    });

    it('should include hasParticipated true when user is in participants', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      const result = await controller.getById('egg-1', 'user-1');
      expect(result.hasParticipated).toBe(true);
    });

    it('should include hasParticipated false when user is not in participants', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      const result = await controller.getById('egg-1', 'other-user');
      expect(result.hasParticipated).toBe(false);
    });

    it('should include hasParticipated false when no userId provided', async () => {
      mockEasterEggService.getById.mockResolvedValue(mockEgg);
      const result = await controller.getById('egg-1');
      expect(result.hasParticipated).toBe(false);
    });
  });
});
