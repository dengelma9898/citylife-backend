import { Injectable } from '@nestjs/common';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import {
  PassStatsPeriod,
  PassStatsResponse,
} from '../../domain/interfaces/pass-stats-response.interface';
import { getPassPeriodBounds } from '../../domain/utils/pass-period.util';

const RECENT_SCANS_LIMIT = 10;

@Injectable()
export class PassStatsService {
  constructor(private readonly passScanRepository: FirebasePassScanRepository) {}

  public async getStats(userId: string, period: PassStatsPeriod): Promise<PassStatsResponse> {
    const { periodStart, periodEnd } = getPassPeriodBounds(period);
    const scans = await this.passScanRepository.findByUserIdInPeriod(
      userId,
      periodStart,
      periodEnd,
    );
    return {
      period,
      periodStart,
      periodEnd,
      benefitUseCount: scans.length,
      recentScans: scans.slice(0, RECENT_SCANS_LIMIT),
    };
  }
}
