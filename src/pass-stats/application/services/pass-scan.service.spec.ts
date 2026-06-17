import { Test, TestingModule } from '@nestjs/testing';
import { PassScanService } from './pass-scan.service';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import { UsersService } from '../../../users/users.service';
import { BusinessCustomer } from '../../../businesses/domain/entities/business.entity';

describe('PassScanService', () => {
  let service: PassScanService;
  const mockRepository = {
    createIfNotExists: jest.fn(),
  };
  const mockUsersService = {
    getUserProfileByCustomerId: jest.fn(),
  };

  const customer = BusinessCustomer.create({
    customerId: 'NSP-user-1',
    scannedAt: '2026-05-10T12:00:00+02:00',
    price: 80,
    benefit: 'Kaffee gratis',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassScanService,
        { provide: FirebasePassScanRepository, useValue: mockRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get(PassScanService);
    jest.clearAllMocks();
    mockRepository.createIfNotExists.mockResolvedValue(true);
  });

  it('should store price and benefit at scan time when userId is provided', async () => {
    await service.recordScanFromBusinessScan({
      businessId: 'biz-1',
      businessName: 'Café',
      scanData: { customerId: 'NSP-user-1', userId: 'firebase-uid-1' },
      customer,
    });
    expect(mockUsersService.getUserProfileByCustomerId).not.toHaveBeenCalled();
    expect(mockRepository.createIfNotExists).toHaveBeenCalledWith(
      'firebase-uid-1',
      expect.objectContaining({
        userId: 'firebase-uid-1',
        price: 80,
        benefit: 'Kaffee gratis',
        businessId: 'biz-1',
      }),
    );
    const record = mockRepository.createIfNotExists.mock.calls[0][1];
    expect(record).not.toHaveProperty('estimatedSavings');
  });

  it('should resolve userId by customerId when userId is missing', async () => {
    mockUsersService.getUserProfileByCustomerId.mockResolvedValue({
      id: 'resolved-uid',
      profile: {} as never,
    });
    await service.recordScanFromBusinessScan({
      businessId: 'biz-1',
      businessName: 'Café',
      scanData: { customerId: 'NSP-user-1', userId: '' },
      customer: BusinessCustomer.create({
        ...customer.toJSON(),
        price: null,
      }),
    });
    expect(mockRepository.createIfNotExists).toHaveBeenCalledWith(
      'resolved-uid',
      expect.objectContaining({ price: null, benefit: 'Kaffee gratis' }),
    );
  });

  it('should skip write when user cannot be resolved', async () => {
    mockUsersService.getUserProfileByCustomerId.mockResolvedValue(null);
    await service.recordScanFromBusinessScan({
      businessId: 'biz-1',
      businessName: 'Café',
      scanData: { customerId: 'NSP-unknown', userId: '' },
      customer,
    });
    expect(mockRepository.createIfNotExists).not.toHaveBeenCalled();
  });
});
