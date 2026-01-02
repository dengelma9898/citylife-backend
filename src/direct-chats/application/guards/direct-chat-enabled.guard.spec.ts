import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { DirectChatEnabledGuard } from './direct-chat-enabled.guard';
import { DirectChatSettingsService } from '../services/direct-chat-settings.service';

describe('DirectChatEnabledGuard', () => {
  let guard: DirectChatEnabledGuard;
  let settingsService: jest.Mocked<DirectChatSettingsService>;

  const mockSettingsService = {
    isFeatureEnabled: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectChatEnabledGuard,
        {
          provide: DirectChatSettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    guard = module.get<DirectChatEnabledGuard>(DirectChatEnabledGuard);
    settingsService = module.get(DirectChatSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when feature is enabled', async () => {
      mockSettingsService.isFeatureEnabled.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockSettingsService.isFeatureEnabled).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException when feature is disabled', async () => {
      mockSettingsService.isFeatureEnabled.mockResolvedValue(false);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        'Direct chat feature is currently disabled',
      );
    });
  });
});

