import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { FirebaseHealthIndicator } from './indicators/firebase-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockResolvedValue({ status: 'ok' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        {
          provide: FirebaseHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { isHealthy: jest.fn() },
        },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('should return basic health check result', async () => {
    const result = await controller.check();
    expect(result).toEqual({ status: 'ok' });
    expect(healthCheckService.check).toHaveBeenCalledWith([]);
  });

  it('should return detailed health check result', async () => {
    await controller.checkDetailed();
    expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
  });
});
