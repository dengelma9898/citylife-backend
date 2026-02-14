import { Test, TestingModule } from '@nestjs/testing';
import { TaxiStandsController } from './taxi-stands.controller';
import { TaxiStandsFeatureService } from '../services/taxi-stands-feature.service';
import { TaxiStandService } from '../services/taxi-stand.service';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';
import { UsersService } from '../../../users/users.service';

describe('TaxiStandsController', () => {
  let controller: TaxiStandsController;
  let mockTaxiStandsFeatureService: Record<string, jest.Mock>;
  let mockTaxiStandService: Record<string, jest.Mock>;

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

  beforeEach(async () => {
    mockTaxiStandsFeatureService = {
      getFeatureStatus: jest.fn(),
      setFeatureStatus: jest.fn(),
      isFeatureActive: jest.fn(),
      trackPhoneClick: jest.fn(),
    };
    mockTaxiStandService = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxiStandsController],
      providers: [
        { provide: TaxiStandsFeatureService, useValue: mockTaxiStandsFeatureService },
        { provide: TaxiStandService, useValue: mockTaxiStandService },
        { provide: UsersService, useValue: { getUserProfile: jest.fn() } },
      ],
    }).compile();
    controller = module.get<TaxiStandsController>(TaxiStandsController);
  });

  describe('getFeatureStatus', () => {
    it('should return feature status', async () => {
      const status = { isFeatureActive: true, startDate: '2026-03-01' };
      mockTaxiStandsFeatureService.getFeatureStatus.mockResolvedValue(status);
      const result = await controller.getFeatureStatus();
      expect(result).toEqual(status);
    });
  });

  describe('setFeatureStatus', () => {
    it('should set feature status', async () => {
      const status = { isFeatureActive: true, startDate: '2026-03-01' };
      mockTaxiStandsFeatureService.setFeatureStatus.mockResolvedValue(status);
      const result = await controller.setFeatureStatus({ isFeatureActive: true, startDate: '2026-03-01' });
      expect(result).toEqual(status);
    });
  });

  describe('getAll', () => {
    it('should return all taxi stands', async () => {
      mockTaxiStandService.getAll.mockResolvedValue([mockTaxiStand]);
      const result = await controller.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('stand-1');
      expect(result[0].phoneNumber).toBe('+49 911 19410');
      expect(result[0].location.address).toBe('Bahnhofplatz 1, 90402 Nürnberg');
    });
  });

  describe('getById', () => {
    it('should return a taxi stand', async () => {
      mockTaxiStandService.getById.mockResolvedValue(mockTaxiStand);
      const result = await controller.getById('stand-1');
      expect(result.id).toBe('stand-1');
      expect(result.phoneClickTimestamps).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create a taxi stand', async () => {
      mockTaxiStandService.create.mockResolvedValue(mockTaxiStand);
      const dto = {
        address: 'Bahnhofplatz 1, 90402 Nürnberg',
        latitude: 49.4465,
        longitude: 11.0828,
        phoneNumber: '+49 911 19410',
        title: 'Hauptbahnhof',
      };
      const result = await controller.create(dto);
      expect(result.id).toBe('stand-1');
    });
  });

  describe('update', () => {
    it('should update a taxi stand', async () => {
      const updatedStand = TaxiStand.fromProps({ ...mockTaxiStandProps, title: 'Aktualisiert' });
      mockTaxiStandService.update.mockResolvedValue(updatedStand);
      const result = await controller.update('stand-1', { title: 'Aktualisiert' });
      expect(result.title).toBe('Aktualisiert');
    });
  });

  describe('delete', () => {
    it('should delete a taxi stand', async () => {
      mockTaxiStandService.delete.mockResolvedValue(undefined);
      await controller.delete('stand-1');
      expect(mockTaxiStandService.delete).toHaveBeenCalledWith('stand-1');
    });
  });

  describe('trackPhoneClick', () => {
    it('should track a phone click', async () => {
      const updatedStand = TaxiStand.fromProps({
        ...mockTaxiStandProps,
        phoneClickTimestamps: [...mockTaxiStandProps.phoneClickTimestamps, '2026-02-01T12:00:00.000Z'],
      });
      mockTaxiStandsFeatureService.trackPhoneClick.mockResolvedValue(updatedStand);
      const result = await controller.trackPhoneClick('stand-1');
      expect(result.phoneClickTimestamps).toHaveLength(2);
    });
  });

  describe('response DTO mapping', () => {
    it('should map entity to response DTO correctly', async () => {
      mockTaxiStandService.getById.mockResolvedValue(mockTaxiStand);
      const result = await controller.getById('stand-1');
      expect(result.id).toBe('stand-1');
      expect(result.title).toBe('Hauptbahnhof');
      expect(result.description).toBe('Vor dem Haupteingang');
      expect(result.numberOfTaxis).toBe(10);
      expect(result.phoneNumber).toBe('+49 911 19410');
      expect(result.location).toEqual({
        address: 'Bahnhofplatz 1, 90402 Nürnberg',
        latitude: 49.4465,
        longitude: 11.0828,
      });
      expect(result.phoneClickTimestamps).toEqual(['2026-01-01T10:00:00.000Z']);
      expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should handle optional fields being undefined', async () => {
      const minimalStand = TaxiStand.fromProps({
        ...mockTaxiStandProps,
        title: undefined,
        description: undefined,
        numberOfTaxis: undefined,
      });
      mockTaxiStandService.getById.mockResolvedValue(minimalStand);
      const result = await controller.getById('stand-1');
      expect(result.title).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.numberOfTaxis).toBeUndefined();
      expect(result.phoneNumber).toBe('+49 911 19410');
    });
  });
});
