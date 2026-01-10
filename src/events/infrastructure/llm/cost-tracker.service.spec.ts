import { Test, TestingModule } from '@nestjs/testing';
import { CostTrackerService } from './cost-tracker.service';

describe('CostTrackerService', () => {
  let service: CostTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostTrackerService],
    }).compile();

    service = module.get<CostTrackerService>(CostTrackerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackUsage', () => {
    it('should track costs for mistral-small-latest', () => {
      service.trackUsage('mistral-small-latest', 1000000, 500000);

      const result = service.getMonthlyCosts();
      expect(result.costs['mistral-small-latest']).toBeCloseTo(0.175, 3); // (1M * 0.075) + (0.5M * 0.2)
      expect(result.total).toBeCloseTo(0.175, 3);
      expect(result.currency).toBe('USD');
    });

    it('should accumulate costs', () => {
      service.trackUsage('mistral-small-latest', 1000000, 500000);
      service.trackUsage('mistral-small-latest', 1000000, 500000);

      const result = service.getMonthlyCosts();
      expect(result.costs['mistral-small-latest']).toBeCloseTo(0.35, 3);
      expect(result.total).toBeCloseTo(0.35, 3);
    });

    it('should track token usage', () => {
      service.trackUsage('mistral-small-latest', 1000000, 500000);

      const result = service.getTokenUsage();
      expect(result.usage['mistral-small-latest'].input).toBe(1000000);
      expect(result.usage['mistral-small-latest'].output).toBe(500000);
      expect(result.usage['mistral-small-latest'].total).toBe(1500000);
      expect(result.totals.input).toBe(1000000);
      expect(result.totals.output).toBe(500000);
      expect(result.totals.total).toBe(1500000);
    });
  });

  describe('resetMonthlyCosts', () => {
    it('should reset costs and token usage', () => {
      service.trackUsage('mistral-small-latest', 1000000, 500000);
      service.resetMonthlyCosts();

      const costs = service.getMonthlyCosts();
      const usage = service.getTokenUsage();

      expect(costs.costs).toEqual({});
      expect(costs.total).toBe(0);
      expect(usage.usage).toEqual({});
      expect(usage.totals.input).toBe(0);
      expect(usage.totals.output).toBe(0);
      expect(usage.totals.total).toBe(0);
    });
  });
});
