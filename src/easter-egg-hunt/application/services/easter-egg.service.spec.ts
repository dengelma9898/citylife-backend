import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EasterEggService } from './easter-egg.service';
import { EASTER_EGG_REPOSITORY } from '../../domain/repositories/easter-egg.repository';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';

describe('EasterEggService', () => {
  let service: EasterEggService;
  let mockRepository: Record<string, jest.Mock>;

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
    participants: [],
    winners: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockEgg = EasterEgg.fromProps(mockEggProps);

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EasterEggService,
        { provide: EASTER_EGG_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<EasterEggService>(EasterEggService);
  });

  describe('getAll', () => {
    it('should return all easter eggs', async () => {
      mockRepository.findAll.mockResolvedValue([mockEgg]);
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('egg-1');
    });
  });

  describe('getActive', () => {
    it('should return only active easter eggs', async () => {
      const activeEgg = EasterEgg.fromProps({
        ...mockEggProps,
        id: 'active-egg',
        startDate: '2020-01-01',
        endDate: undefined,
      });
      const inactiveEgg = EasterEgg.fromProps({
        ...mockEggProps,
        id: 'inactive-egg',
        startDate: '2099-01-01',
      });
      mockRepository.findAll.mockResolvedValue([activeEgg, inactiveEgg]);
      const result = await service.getActive();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('active-egg');
    });
  });

  describe('getById', () => {
    it('should return easter egg by id', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      const result = await service.getById('egg-1');
      expect(result.id).toBe('egg-1');
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an easter egg', async () => {
      mockRepository.create.mockImplementation(egg => Promise.resolve(egg));
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
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an easter egg', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      const result = await service.update('egg-1', { title: 'Aktualisiertes Ei' });
      expect(result.title).toBe('Aktualisiertes Ei');
      expect(mockRepository.update).toHaveBeenCalledWith('egg-1', expect.any(Object));
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('should update location partially', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      const result = await service.update('egg-1', { address: 'Neue Adresse' });
      expect(result.location.address).toBe('Neue Adresse');
      expect(result.location.latitude).toBe(49.4539);
    });
  });

  describe('updateImageUrl', () => {
    it('should update image URL', async () => {
      mockRepository.findById.mockResolvedValue(mockEgg);
      mockRepository.update.mockImplementation((id, egg) => Promise.resolve(egg));
      const result = await service.updateImageUrl('egg-1', 'https://example.com/new.jpg');
      expect(result.imageUrl).toBe('https://example.com/new.jpg');
    });

    it('should throw NotFoundException when egg not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.updateImageUrl('nonexistent', 'url')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an easter egg', async () => {
      mockRepository.delete.mockResolvedValue(undefined);
      await service.delete('egg-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('egg-1');
    });
  });
});
