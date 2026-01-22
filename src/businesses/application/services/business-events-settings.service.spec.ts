import { Test, TestingModule } from '@nestjs/testing';
import { BusinessEventsSettingsService } from './business-events-settings.service';
import { BusinessEventsSettingsRepository } from '../../domain/repositories/business-events-settings.repository';
import { BusinessEventsSettings } from '../../domain/entities/business-events-settings.entity';

describe('BusinessEventsSettingsService', () => {
  let service: BusinessEventsSettingsService;
  let repository: jest.Mocked<BusinessEventsSettingsRepository>;

  const mockRepository = {
    get: jest.fn(),
    save: jest.fn(),
  };

  const mockSettings = BusinessEventsSettings.fromProps({
    id: 'business_events_settings',
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  const mockDisabledSettings = BusinessEventsSettings.fromProps({
    id: 'business_events_settings',
    isEnabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin-1',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessEventsSettingsService,
        {
          provide: BusinessEventsSettingsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BusinessEventsSettingsService>(BusinessEventsSettingsService);
    repository = module.get(BusinessEventsSettingsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return current settings', async () => {
      mockRepository.get.mockResolvedValue(mockSettings);

      const result = await service.getSettings();

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockRepository.get).toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', async () => {
      mockRepository.get.mockResolvedValue(mockSettings);

      const result = await service.isFeatureEnabled();

      expect(result).toBe(true);
    });

    it('should return false when feature is disabled', async () => {
      mockRepository.get.mockResolvedValue(mockDisabledSettings);

      const result = await service.isFeatureEnabled();

      expect(result).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update settings to disabled', async () => {
      mockRepository.get.mockResolvedValue(mockSettings);
      mockRepository.save.mockImplementation(settings => Promise.resolve(settings));

      const result = await service.updateSettings(false, 'admin-1');

      expect(result.isEnabled).toBe(false);
      expect(result.updatedBy).toBe('admin-1');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update settings to enabled', async () => {
      mockRepository.get.mockResolvedValue(mockDisabledSettings);
      mockRepository.save.mockImplementation(settings => Promise.resolve(settings));

      const result = await service.updateSettings(true, 'admin-2');

      expect(result.isEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-2');
    });
  });
});
