import { Test, TestingModule } from '@nestjs/testing';
import { DirectChatSettingsService } from './direct-chat-settings.service';
import { DirectChatSettingsRepository } from '../../domain/repositories/direct-chat-settings.repository';
import { DirectChatSettings } from '../../domain/entities/direct-chat-settings.entity';

describe('DirectChatSettingsService', () => {
  let service: DirectChatSettingsService;
  let repository: jest.Mocked<DirectChatSettingsRepository>;

  const mockRepository = {
    get: jest.fn(),
    save: jest.fn(),
  };

  const mockSettings = DirectChatSettings.fromProps({
    id: 'direct_chat_settings',
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  const mockDisabledSettings = DirectChatSettings.fromProps({
    id: 'direct_chat_settings',
    isEnabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin-1',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectChatSettingsService,
        {
          provide: DirectChatSettingsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DirectChatSettingsService>(DirectChatSettingsService);
    repository = module.get(DirectChatSettingsRepository);
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

