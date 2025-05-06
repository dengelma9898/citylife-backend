import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users.service';
import { BusinessHistory } from '../interfaces/business-history.interface';
import { DateTimeUtils } from 'src/utils/date-time.utils';

@Injectable()
export class UserAdapterService {
  private readonly logger = new Logger(UserAdapterService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService
  ) {}

  public async addBusinessToHistory(userId: string, businessId: string, businessName: string, benefit: string): Promise<void> {
    this.logger.debug(`Adding business ${businessId} to history of user ${userId}`);
    
    const historyEntry: BusinessHistory = {
      businessId: businessId,
      businessName: businessName,
      benefit: benefit,
      visitedAt: DateTimeUtils.getUTCTime()
    };

    const user = await this.usersService.getUserProfile(userId);
    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    const updatedHistory = [...(user.businessHistory || []), historyEntry];
    await this.usersService.update(userId, { businessHistory: updatedHistory });
  }
} 