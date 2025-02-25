import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { BusinessHistory } from '../../users/interfaces/business-history.interface';

@Injectable()
export class UserAdapterService {
  private readonly logger = new Logger(UserAdapterService.name);

  constructor(private readonly usersService: UsersService) {}

  public async addBusinessToHistory(userId: string, businessId: string, businessName: string, benefit: string): Promise<void> {
    this.logger.debug(`Adding business ${businessId} to history of user ${userId}`);
    
    const historyEntry: BusinessHistory = {
      businessId: businessId,
      businessName: businessName,
      benefit: benefit,
      visitedAt: new Date().toISOString()
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