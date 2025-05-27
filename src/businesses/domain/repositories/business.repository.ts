import { Business } from '../entities/business.entity';
import { BusinessStatus } from '../enums/business-status.enum';

export const BUSINESS_REPOSITORY = 'BUSINESS_REPOSITORY';

export interface BusinessRepository {
  findAll(): Promise<Business[]>;
  findById(id: string): Promise<Business | null>;
  create(business: Business): Promise<Business>;
  update(id: string, business: Business): Promise<Business>;
  delete(id: string): Promise<void>;
  findByStatus(status: BusinessStatus): Promise<Business[]>;
  findByStatusAndHasAccount(status: BusinessStatus, hasAccount: boolean): Promise<Business[]>;
}
