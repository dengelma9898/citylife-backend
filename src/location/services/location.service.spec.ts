import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';

// Mock node-fetch
const mockFetch = jest.fn();
jest.mock('node-fetch', () => ({
  __esModule: true,
  default: (...args: any[]) => mockFetch(...args),
}));

describe('LocationService', () => {
  let service: LocationService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
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
      postalCode: '12345',
    },
    position: {
      lat: 49.4521,
      lng: 11.0767,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock HERE API credentials
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'HERE_APP_ID':
          return 'test-app-id';
        case 'HERE_API_KEY':
          return 'test-api-key';
        default:
          return undefined;
      }
    });

    // Reset fetch mock before each test
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchLocations', () => {
    it('should return location results when API call is successful', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [mockLocationResult],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.searchLocations('Test Street');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockLocationResult);
      expect(mockConfigService.get).toHaveBeenCalledWith('HERE_APP_ID');
      expect(mockConfigService.get).toHaveBeenCalledWith('HERE_API_KEY');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return empty array when API returns no results', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.searchLocations('Nonexistent Street');

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw error when HERE API credentials are not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(service.searchLocations('Test Street')).rejects.toThrow(
        'HERE API credentials are not configured',
      );
    });

    it('should throw error when API call fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      mockFetch.mockResolvedValue(mockResponse);

      await expect(service.searchLocations('Test Street')).rejects.toThrow(
        'HERE API responded with status: 500',
      );
    });

    it('should throw error when API call throws an exception', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(service.searchLocations('Test Street')).rejects.toThrow(error);
    });
  });
});
