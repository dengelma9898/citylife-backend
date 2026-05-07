import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { CuratedSpotsUserRatingsEnabledGuard } from './curated-spots-user-ratings-enabled.guard';
import { CuratedSpotsUserRatingsSettingsService } from '../services/curated-spots-user-ratings-settings.service';

describe('CuratedSpotsUserRatingsEnabledGuard', () => {
  let guard: CuratedSpotsUserRatingsEnabledGuard;

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
        CuratedSpotsUserRatingsEnabledGuard,
        {
          provide: CuratedSpotsUserRatingsSettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();
    guard = module.get<CuratedSpotsUserRatingsEnabledGuard>(CuratedSpotsUserRatingsEnabledGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when feature is enabled', async () => {
    mockSettingsService.isFeatureEnabled.mockResolvedValue(true);
    await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
  });

  it('should throw when feature is disabled', async () => {
    mockSettingsService.isFeatureEnabled.mockResolvedValue(false);
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ServiceUnavailableException);
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      'Curated spots user ratings feature is currently disabled',
    );
  });
});
