import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxiStandService } from './taxi-stand.service';
import { TAXI_STAND_REPOSITORY } from '../../domain/repositories/taxi-stand.repository';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';

describe('TaxiStandService', () => {
  let service: TaxiStandService;
  let mockRepository: Record<string, jest.Mock>;

  const mockTaxiStandProps = {
    id: 'stand-1',
    title: 'Hauptbahnhof',
    description: 'Vor dem Haupteingang',
    numberOfTaxis: 10,
    phoneNumber: '+49 911 19410',
    location: { address: 'Bahnhofplatz 1, 90402 Nürnberg', latitude: 49.4465, longitude: 11.0828 },
    phoneClickTimestamps: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockTaxiStand = TaxiStand.fromProps(mockTaxiStandProps);

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
        TaxiStandService,
        { provide: TAXI_STAND_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<TaxiStandService>(TaxiStandService);
  });

  describe('getAll', () => {
    it('should return all taxi stands', async () => {
      mockRepository.findAll.mockResolvedValue([mockTaxiStand]);
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stand-1');
    });
  });

  describe('getById', () => {
    it('should return a taxi stand', async () => {
      mockRepository.findById.mockResolvedValue(mockTaxiStand);
      const result = await service.getById('stand-1');
      expect(result.id).toBe('stand-1');
      expect(result.phoneNumber).toBe('+49 911 19410');
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a taxi stand', async () => {
      mockRepository.create.mockImplementation((stand) => Promise.resolve(stand));
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
    });
  });

  describe('update', () => {
    it('should update a taxi stand', async () => {
      mockRepository.findById.mockResolvedValue(mockTaxiStand);
      mockRepository.update.mockImplementation((id, stand) => Promise.resolve(stand));
      const result = await service.update('stand-1', { title: 'Neuer Titel' });
      expect(result.title).toBe('Neuer Titel');
      expect(result.phoneNumber).toBe('+49 911 19410');
    });

    it('should update location when address is provided', async () => {
      mockRepository.findById.mockResolvedValue(mockTaxiStand);
      mockRepository.update.mockImplementation((id, stand) => Promise.resolve(stand));
      const result = await service.update('stand-1', { address: 'Neue Adresse' });
      expect(result.location.address).toBe('Neue Adresse');
      expect(result.location.latitude).toBe(49.4465);
    });

    it('should update location when latitude is provided', async () => {
      mockRepository.findById.mockResolvedValue(mockTaxiStand);
      mockRepository.update.mockImplementation((id, stand) => Promise.resolve(stand));
      const result = await service.update('stand-1', { latitude: 50.0 });
      expect(result.location.latitude).toBe(50.0);
      expect(result.location.address).toBe('Bahnhofplatz 1, 90402 Nürnberg');
    });

    it('should throw NotFoundException when taxi stand not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.update('nonexistent', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a taxi stand', async () => {
      mockRepository.delete.mockResolvedValue(undefined);
      await service.delete('stand-1');
      expect(mockRepository.delete).toHaveBeenCalledWith('stand-1');
    });
  });
});
