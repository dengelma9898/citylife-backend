import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { PassStatsController } from './pass-stats.controller';
import { PassStatsService } from '../services/pass-stats.service';
import { AuthGuard } from '../../../core/guards/auth.guard';

describe('PassStatsController', () => {
  let controller: PassStatsController;
  const mockPassStatsService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PassStatsController],
      providers: [{ provide: PassStatsService, useValue: mockPassStatsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PassStatsController);
    jest.clearAllMocks();
  });

  it('should return pass stats for authenticated user', async () => {
    const stats = {
      period: 'month' as const,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      benefitUseCount: 4,
      recentScans: [],
    };
    mockPassStatsService.getStats.mockResolvedValue(stats);
    const result = await controller.getPassStats(
      { user: { uid: 'user-1' } },
      'user-1',
      { period: 'month' },
    );
    expect(result).toEqual(stats);
    expect(mockPassStatsService.getStats).toHaveBeenCalledWith('user-1', 'month');
  });

  it('should default period to month when omitted', async () => {
    mockPassStatsService.getStats.mockResolvedValue({
      period: 'month',
      periodStart: '',
      periodEnd: '',
      benefitUseCount: 0,
      recentScans: [],
    });
    await controller.getPassStats({ user: { uid: 'user-1' } }, 'user-1', {});
    expect(mockPassStatsService.getStats).toHaveBeenCalledWith('user-1', 'month');
  });

  it('should reject when user id does not match token', async () => {
    await expect(
      controller.getPassStats({ user: { uid: 'other-user' } }, 'user-1', { period: 'month' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
