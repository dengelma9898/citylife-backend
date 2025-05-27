import { BusinessCategory } from '../entities/business-category.entity';

export const BUSINESS_CATEGORY_REPOSITORY = 'BUSINESS_CATEGORY_REPOSITORY';

export interface BusinessCategoryRepository {
  findAll(): Promise<BusinessCategory[]>;
  findById(id: string): Promise<BusinessCategory | null>;
  create(category: BusinessCategory): Promise<BusinessCategory>;
  update(id: string, category: BusinessCategory): Promise<BusinessCategory>;
  delete(id: string): Promise<void>;
}
