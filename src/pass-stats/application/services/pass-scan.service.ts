import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { UsersService } from '../../../users/users.service';
import { FirebasePassScanRepository } from '../../infrastructure/persistence/firebase-pass-scan.repository';
import { buildPassScanId } from '../../domain/utils/pass-scan-id.util';
import { BusinessCustomer } from '../../../businesses/domain/entities/business.entity';
import { BusinessCustomerDto } from '../../../businesses/dto/business-customer.dto';

export interface RecordPassScanParams {
  readonly businessId: string;
  readonly businessName: string;
  readonly scanData: BusinessCustomerDto;
  readonly customer: BusinessCustomer;
}

@Injectable()
export class PassScanService {
  private readonly logger = new Logger(PassScanService.name);

  constructor(
    private readonly passScanRepository: FirebasePassScanRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  /**
   * Records a pass scan for the user. Failures are logged but do not affect the business scan.
   */
  public async recordScanFromBusinessScan(params: RecordPassScanParams): Promise<void> {
    const userId = await this.resolveUserId(params.scanData);
    if (!userId) {
      this.logger.warn(
        `Could not resolve userId for pass scan (customerId=${params.scanData.customerId})`,
      );
      return;
    }
    const scanId = buildPassScanId(
      params.businessId,
      params.customer.customerId,
      params.customer.scannedAt,
    );
    const created = await this.passScanRepository.createIfNotExists(userId, {
      id: scanId,
      userId,
      customerId: params.customer.customerId,
      businessId: params.businessId,
      businessName: params.businessName,
      scannedAt: params.customer.scannedAt,
      benefit: params.customer.benefit,
      price: params.customer.price ?? null,
      numberOfPeople: params.customer.numberOfPeople ?? null,
    });
    if (created) {
      this.logger.debug(`Pass scan recorded for user ${userId}, scanId=${scanId}`);
    }
  }

  private async resolveUserId(scanData: BusinessCustomerDto): Promise<string | null> {
    if (scanData.userId) {
      return scanData.userId;
    }
    const userResult = await this.usersService.getUserProfileByCustomerId(scanData.customerId);
    return userResult?.id ?? null;
  }
}
