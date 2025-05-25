import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './services/location.service';
import { LocationResult } from './interfaces/location-result.interface';
import { LocationSearchDto } from './dto/location-search.dto';

describe('LocationController', () => {
  let controller: LocationController;
  let service: LocationService;

  const mockLocationService = {
    searchLocations: jest.fn()
  };

  const mockLocationResult: LocationResult = {
    title: 'Test Location',
    id: 'test-id',
    resultType: 'address',
    address: {
      label: 'Test Street 1, 12345 Test City',
      countryCode: 'DE',
      countryName: 'Germany',
      state: 'Bavaria',
      county: 'Test County',
      city: 'Test City',
      district: 'Test District',
      street: 'Test Street',
      postalCode: '12345'
    },
    position: {
      lat: 49.4521,
      lng: 11.0767
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: mockLocationService
        }
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchLocations', () => {
    it('should return an array of location results', async () => {
      const searchDto: LocationSearchDto = { query: 'Test Street' };
      mockLocationService.searchLocations.mockResolvedValue([mockLocationResult]);

      const result = await controller.searchLocations(searchDto);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockLocationResult);
      expect(mockLocationService.searchLocations).toHaveBeenCalledWith(searchDto.query);
    });

    it('should return an empty array when no results are found', async () => {
      const searchDto: LocationSearchDto = { query: 'Nonexistent Street' };
      mockLocationService.searchLocations.mockResolvedValue([]);

      const result = await controller.searchLocations(searchDto);

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockLocationService.searchLocations).toHaveBeenCalledWith(searchDto.query);
    });

    it('should handle service errors', async () => {
      const searchDto: LocationSearchDto = { query: 'Test Street' };
      const error = new Error('API Error');
      mockLocationService.searchLocations.mockRejectedValue(error);

      await expect(controller.searchLocations(searchDto))
        .rejects
        .toThrow(error);
    });
  });
}); 