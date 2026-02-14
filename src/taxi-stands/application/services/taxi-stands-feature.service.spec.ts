import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxiStandsFeatureService } from './taxi-stands-feature.service';
import { TAXI_STAND_REPOSITORY } from '../../domain/repositories/taxi-stand.repository';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('TaxiStandsFeatureService', () => {
  let service: TaxiStandsFeatureService;
  let mockRepository: Record<string, jest.Mock>;
  let mockFirebaseService: Record<string, jest.Mock>;

  const mockTaxiStandProps = {
    id: 'stand-1',
    title: 'Hauptbahnhof',
    description: 'Vor dem Haupteingang',
    numberOfTaxis: 10,
    phoneNumber: '+49 911 19410',
    location: { address: 'Bahnhofplatz 1, 90402 Nürnberg', latitude: 49.4465, longitude: 11.0828 },
    phoneClickTimestamps: ['2026-01-01T10:00:00.000Z'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockTaxiStand = TaxiStand.fromProps(mockTaxiStandProps);

  const mockFirestoreDoc = {
    exists: true,
    data: () => ({ isFeatureActive: true, startDate: '2026-03-01' }),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxiStandsFeatureService,
        { provide: TAXI_STAND_REPOSITORY, useValue: mockRepository },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();
    service = module.get<TaxiStandsFeatureService>(TaxiStandsFeatureService);
  });

  describe('getFeatureStatus', () => {
    it('should return feature status', async () => {
      const result = await service.getFeatureStatus();
      expect(result.isFeatureActive).toBe(true);
      expect(result.startDate).toBe('2026-03-01');
    });

    it('should return inactive when document does not exist', async () => {
      mockDocRef.get.mockResolvedValueOnce({ exists: false });
      const result = await service.getFeatureStatus();
      expect(result.isFeatureActive).toBe(false);
    });
  });

  describe('isFeatureActive', () => {
    it('should return true when feature is active and no startDate', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ isFeatureActive: true }),
      });
      const result = await service.isFeatureActive();
      expect(result).toBe(true);
    });

    it('should return false when feature is inactive', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ isFeatureActive: false }),
      });
      const result = await service.isFeatureActive();
      expect(result).toBe(false);
    });

    it('should return true when startDate is in the past', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ isFeatureActive: true, startDate: '2020-01-01' }),
      });
      const result = await service.isFeatureActive();
      expect(result).toBe(true);
    });

    it('should return false when startDate is in the future', async () => {
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ isFeatureActive: true, startDate: '2099-01-01' }),
      });
      const result = await service.isFeatureActive();
      expect(result).toBe(false);
    });
  });

  describe('setFeatureStatus', () => {
    it('should set feature status', async () => {
      const result = await service.setFeatureStatus(true, '2026-03-01');
      expect(result.isFeatureActive).toBe(true);
      expect(result.startDate).toBe('2026-03-01');
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({ isFeatureActive: true, startDate: '2026-03-01' }),
        { merge: true },
      );
    });

    it('should set feature status without startDate', async () => {
      const result = await service.setFeatureStatus(false);
      expect(result.isFeatureActive).toBe(false);
      expect(result.startDate).toBeUndefined();
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({ isFeatureActive: false }),
        { merge: true },
      );
    });
  });

  describe('trackPhoneClick', () => {
    it('should track a phone click', async () => {
      mockRepository.findById.mockResolvedValue(mockTaxiStand);
      mockRepository.update.mockImplementation((id, stand) => Promise.resolve(stand));
      const result = await service.trackPhoneClick('stand-1');
      expect(result.phoneClickTimestamps.length).toBe(2);
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.trackPhoneClick('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
