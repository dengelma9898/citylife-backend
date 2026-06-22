import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TaxiStandService } from './taxi-stand.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';

describe('TaxiStandService', () => {
  let service: TaxiStandService;
  let mockDoc: {
    id: string;
    exists: boolean;
    data: jest.Mock;
    get: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    add: jest.Mock;
    get: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };

  const mockTaxiStandData = {
    title: 'Hauptbahnhof',
    description: 'Vor dem Haupteingang',
    numberOfTaxis: 10,
    phoneNumber: '+49 911 19410',
    location: { address: 'Bahnhofplatz 1, 90402 Nürnberg', latitude: 49.4465, longitude: 11.0828 },
    phoneClickTimestamps: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockTaxiStandProps = {
    id: 'stand-1',
    ...mockTaxiStandData,
  };

  const mockTaxiStand = TaxiStand.fromProps(mockTaxiStandProps);

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    mockDoc = {
      id: 'stand-1',
      exists: true,
      data: jest.fn().mockReturnValue(mockTaxiStandData),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'stand-1',
        data: () => mockTaxiStandData,
      }),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'stand-new' }),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'stand-1', data: () => mockTaxiStandData }],
      }),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockCacheManager.get.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxiStandService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<TaxiStandService>(TaxiStandService);
  });

  describe('getAll', () => {
    it('should return all taxi stands', async () => {
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stand-1');
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached taxi stands on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue([mockTaxiStand]);
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(mockCollection.get).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a taxi stand', async () => {
      const result = await service.getById('stand-1');
      expect(result.id).toBe('stand-1');
      expect(result.phoneNumber).toBe('+49 911 19410');
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a taxi stand', async () => {
      const dto = {
        address: 'Bahnhofplatz 1, 90402 Nürnberg',
        latitude: 49.4465,
        longitude: 11.0828,
        phoneNumber: '+49 911 19410',
        title: 'Hauptbahnhof',
        description: 'Vor dem Haupteingang',
        numberOfTaxis: 10,
      };
      const result = await service.create(dto);
      expect(result.phoneNumber).toBe('+49 911 19410');
      expect(result.location.address).toBe('Bahnhofplatz 1, 90402 Nürnberg');
      expect(result.location.latitude).toBe(49.4465);
      expect(result.phoneClickTimestamps).toEqual([]);
      expect(mockCacheManager.del).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a taxi stand', async () => {
      const result = await service.update('stand-1', { title: 'Neuer Titel' });
      expect(result.title).toBe('Neuer Titel');
      expect(result.phoneNumber).toBe('+49 911 19410');
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should update location when address is provided', async () => {
      const result = await service.update('stand-1', { address: 'Neue Adresse' });
      expect(result.location.address).toBe('Neue Adresse');
      expect(result.location.latitude).toBe(49.4465);
    });

    it('should update location when latitude is provided', async () => {
      const result = await service.update('stand-1', { latitude: 50.0 });
      expect(result.location.latitude).toBe(50.0);
      expect(result.location.address).toBe('Bahnhofplatz 1, 90402 Nürnberg');
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a taxi stand', async () => {
      await service.delete('stand-1');
      expect(mockDoc.delete).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
