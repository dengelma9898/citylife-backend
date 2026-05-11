import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';

const mockFetch = jest.fn();

describe('LocationService', () => {
  let service: LocationService;
  let configService: ConfigService;
  const originalFetch = globalThis.fetch;

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

    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = originalFetch;
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

    it('should filter out locations outside Germany', async () => {
      const germanResult = { ...mockLocationResult, id: 'de-1' };
      const austrianResult = {
        ...mockLocationResult,
        id: 'at-1',
        address: { ...mockLocationResult.address, countryCode: 'AT' },
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [germanResult, austrianResult],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.searchLocations('Wien');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].address.countryCode).toBe('DE');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('in=countryCode%3ADEU'),
      );
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

  describe('reverseGeocode', () => {
    it('should prefer German item with street when first is coarse', async () => {
      const coarse: LocationResult = {
        ...mockLocationResult,
        id: 'coarse',
        resultType: 'locality',
        address: {
          ...mockLocationResult.address,
          street: '',
          postalCode: '90409',
          city: 'Nürnberg',
          label: 'Nürnberg',
        },
      };
      const detailed = {
        ...mockLocationResult,
        id: 'detailed',
        resultType: 'houseNumber',
        address: {
          ...mockLocationResult.address,
          street: 'Schillerstraße',
          postalCode: '90409',
          city: 'Nürnberg',
          label: 'Schillerstraße 4, 90409 Nürnberg',
          houseNumber: '4',
        },
      } as LocationResult;
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [coarse, detailed],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(49.4521, 11.0767);

      expect(result).toEqual(detailed);
    });

    it('should return first German location when API succeeds', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [mockLocationResult],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(49.4521, 11.0767);

      expect(result).toEqual(mockLocationResult);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/revgeocode\.search\.hereapi\.com\/v1\/revgeocode\?.*at=49\.4521%2C11\.0767/),
      );
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('apiKey=test-api-key'));
      expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('in=countryCode'));
    });

    it('should return null when API returns no items', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(49.4521, 11.0767);

      expect(result).toBeNull();
    });

    it('should return null when no German result in items', async () => {
      const austrianResult = {
        ...mockLocationResult,
        id: 'at-1',
        address: { ...mockLocationResult.address, countryCode: 'AT' },
      };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [austrianResult],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(48.2082, 16.3738);

      expect(result).toBeNull();
    });

    it('should pick first German result when multiple items returned', async () => {
      const austrianFirst = {
        ...mockLocationResult,
        id: 'at-1',
        address: { ...mockLocationResult.address, countryCode: 'AT' },
      };
      const germanSecond = { ...mockLocationResult, id: 'de-2' };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [austrianFirst, germanSecond],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(49.4521, 11.0767);

      expect(result).toEqual(germanSecond);
    });

    it('should throw when HERE API credentials are not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(service.reverseGeocode(49.4521, 11.0767)).rejects.toThrow(
        'HERE API credentials are not configured',
      );
    });

    it('should throw when API responds with non-ok status', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 502 });

      await expect(service.reverseGeocode(49.4521, 11.0767)).rejects.toThrow(
        'HERE API responded with status: 502',
      );
    });

    it('should throw when fetch throws', async () => {
      const error = new Error('Network error');
      mockFetch.mockRejectedValue(error);

      await expect(service.reverseGeocode(49.4521, 11.0767)).rejects.toThrow(error);
    });
  });
});
