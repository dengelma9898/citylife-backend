import { Injectable, Logger, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import { UsersService } from '../../../users/users.service';
import {
  PASS_STATS_TEST_USER_ID,
  buildPassStatsTestSeedRecords,
} from './pass-stats-test-seed.data';

@Injectable()
export class PassStatsTestSeedService implements OnModuleInit {
  private readonly logger = new Logger(PassStatsTestSeedService.name);

  constructor(
    private readonly passScanRepository: FirebasePassScanRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'dev') {
      return;
    }
    await this.seedIfNeeded();
  }

  public async seedIfNeeded(): Promise<void> {
    const userId = PASS_STATS_TEST_USER_ID;
    if (await this.passScanRepository.hasDevSeedMarker(userId)) {
      this.logger.debug(`Pass stats test seed already applied for user ${userId}`);
      return;
    }
    const profile = await this.usersService.getById(userId);
    if (!profile) {
      this.logger.warn(
        `Pass stats test seed skipped: user ${userId} not found in users collection`,
      );
      return;
    }
    const userProfile = profile as { customerId?: string };
    const customerId = userProfile.customerId ?? `NSP-${userId}`;
    const records = buildPassStatsTestSeedRecords(userId, customerId);
    let created = 0;
    for (const record of records) {
      const wasCreated = await this.passScanRepository.createIfNotExists(userId, record);
      if (wasCreated) {
        created += 1;
      }
    }
    await this.passScanRepository.setDevSeedMarker(userId);
    this.logger.log(
      `Pass stats test seed completed for user ${userId}: ${created} scans across ${records.length} slots`,
    );
  }
}
