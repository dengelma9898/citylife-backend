import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EasterEggService } from './easter-egg.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';

describe('EasterEggService', () => {
  let service: EasterEggService;
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

  const mockEggData = {
    title: 'Goldenes Ei',
    description: 'Am Hauptmarkt versteckt',
    imageUrl: 'https://example.com/egg.jpg',
    prizeDescription: '2x Kinogutscheine',
    numberOfWinners: 1,
    startDate: '2026-03-28',
    endDate: '2026-04-06',
    location: { address: 'Hauptmarkt 1, Nürnberg', latitude: 49.4539, longitude: 11.0775 },
    participants: [],
    winners: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockEggProps = {
    id: 'egg-1',
    ...mockEggData,
  };

  const mockEgg = EasterEgg.fromProps(mockEggProps);

  beforeEach(async () => {
    mockDoc = {
      id: 'egg-1',
      exists: true,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'egg-1',
        data: () => mockEggData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'egg-new' }),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'egg-1', data: () => mockEggData }],
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EasterEggService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue(mockCollection) }) } },
      ],
    }).compile();
    service = module.get<EasterEggService>(EasterEggService);
  });

  describe('getAll', () => {
    it('should return all easter eggs', async () => {
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('egg-1');
    });
  });

  describe('getActive', () => {
    it('should return only active easter eggs', async () => {
      const activeData = { ...mockEggData, startDate: '2020-01-01', endDate: undefined };
      const inactiveData = { ...mockEggData, startDate: '2099-01-01' };
      mockCollection.get.mockResolvedValueOnce({
        docs: [
          { id: 'active-egg', data: () => activeData },
          { id: 'inactive-egg', data: () => inactiveData },
        ],
      });
      const result = await service.getActive();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('active-egg');
    });
  });

  describe('getById', () => {
    it('should return easter egg by id', async () => {
      const result = await service.getById('egg-1');
      expect(result.id).toBe('egg-1');
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an easter egg', async () => {
      const dto = {
        title: 'Neues Ei',
        description: 'Beschreibung',
        prizeDescription: 'Preis',
        numberOfWinners: 2,
        startDate: '2026-03-28',
        endDate: '2026-04-06',
        address: 'Hauptmarkt 1',
        latitude: 49.4539,
        longitude: 11.0775,
      };
      const result = await service.create(dto);
      expect(result.title).toBe('Neues Ei');
      expect(result.participants).toEqual([]);
      expect(result.winners).toEqual([]);
      expect(mockCollection.add).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an easter egg', async () => {
      const result = await service.update('egg-1', { title: 'Aktualisiertes Ei' });
      expect(result.title).toBe('Aktualisiertes Ei');
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should update location partially', async () => {
      const result = await service.update('egg-1', { address: 'Neue Adresse' });
      expect(result.location.address).toBe('Neue Adresse');
      expect(result.location.latitude).toBe(49.4539);
    });
  });

  describe('updateImageUrl', () => {
    it('should update image URL', async () => {
      const result = await service.updateImageUrl('egg-1', 'https://example.com/new.jpg');
      expect(result.imageUrl).toBe('https://example.com/new.jpg');
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.updateImageUrl('nonexistent', 'url')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an easter egg', async () => {
      await service.delete('egg-1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
