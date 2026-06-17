import { Test, TestingModule } from '@nestjs/testing';
import { PassStatsTestSeedService } from './pass-stats-test-seed.service';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import { UsersService } from '../../../users/users.service';
import { PASS_STATS_TEST_USER_ID } from './pass-stats-test-seed.data';

describe('PassStatsTestSeedService', () => {
  let service: PassStatsTestSeedService;
  const mockRepository = {
    hasDevSeedMarker: jest.fn(),
    setDevSeedMarker: jest.fn(),
    createIfNotExists: jest.fn(),
  };
  const mockUsersService = {
    getById: jest.fn(),
  };
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PassStatsTestSeedService,
        { provide: FirebasePassScanRepository, useValue: mockRepository },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get(PassStatsTestSeedService);
    jest.clearAllMocks();
    mockRepository.hasDevSeedMarker.mockResolvedValue(false);
    mockRepository.createIfNotExists.mockResolvedValue(true);
    mockRepository.setDevSeedMarker.mockResolvedValue(undefined);
    mockUsersService.getById.mockResolvedValue({
      customerId: `NSP-${PASS_STATS_TEST_USER_ID}`,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should skip seeding when marker already exists', async () => {
    mockRepository.hasDevSeedMarker.mockResolvedValue(true);
    await service.seedIfNeeded();
    expect(mockRepository.createIfNotExists).not.toHaveBeenCalled();
    expect(mockRepository.setDevSeedMarker).not.toHaveBeenCalled();
  });

  it('should skip seeding when test user does not exist', async () => {
    mockUsersService.getById.mockResolvedValue(null);
    await service.seedIfNeeded();
    expect(mockRepository.createIfNotExists).not.toHaveBeenCalled();
  });

  it('should seed scans and set marker once', async () => {
    await service.seedIfNeeded();
    expect(mockRepository.createIfNotExists).toHaveBeenCalled();
    expect(mockRepository.setDevSeedMarker).toHaveBeenCalledWith(PASS_STATS_TEST_USER_ID);
  });

  it('should not run onModuleInit outside dev', async () => {
    process.env.NODE_ENV = 'prd';
    const seedSpy = jest.spyOn(service, 'seedIfNeeded');
    await service.onModuleInit();
    expect(seedSpy).not.toHaveBeenCalled();
  });
});
