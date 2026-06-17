import { Test, TestingModule } from '@nestjs/testing';
import { PassStatsService } from './pass-stats.service';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import { PassScanRecord } from '../../domain/interfaces/pass-scan-record.interface';

describe('PassStatsService', () => {
  let service: PassStatsService;
  const mockRepository = {
    findByUserIdInPeriod: jest.fn(),
  };

  const baseScan: PassScanRecord = {
    id: 'scan-1',
    userId: 'user-1',
    customerId: 'NSP-user-1',
    businessId: 'biz-1',
    businessName: 'Café Test',
    scannedAt: '2026-05-10T12:00:00+02:00',
    benefit: '10% Rabatt',
    price: 100,
    numberOfPeople: 2,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassStatsService,
        { provide: FirebasePassScanRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get(PassStatsService);
    jest.clearAllMocks();
  });

  it('should return benefit use count and recent scans with price and benefit', async () => {
    mockRepository.findByUserIdInPeriod.mockResolvedValue([
      baseScan,
      { ...baseScan, id: 'scan-2', price: 50, benefit: '2 für 1' },
      { ...baseScan, id: 'scan-3', price: null },
    ]);
    const result = await service.getStats('user-1', 'month');
    expect(result.benefitUseCount).toBe(3);
    expect(result.recentScans).toHaveLength(3);
    expect(result.recentScans[0].benefit).toBe('10% Rabatt');
    expect(result).not.toHaveProperty('estimatedSavingsTotal');
    expect(result.period).toBe('month');
  });

  it('should support year period', async () => {
    mockRepository.findByUserIdInPeriod.mockResolvedValue([]);
    const result = await service.getStats('user-1', 'year');
    expect(result.benefitUseCount).toBe(0);
    expect(result.period).toBe('year');
  });
});
