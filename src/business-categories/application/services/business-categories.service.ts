import { Injectable, Inject, Logger } from '@nestjs/common';
import { BusinessCategory } from '../../domain/entities/business-category.entity';
import {
  BusinessCategoryRepository,
  BUSINESS_CATEGORY_REPOSITORY,
} from '../../domain/repositories/business-category.repository';
import { KeywordsService } from '../../../keywords/keywords.service';

import { UpdateBusinessCategoryDto } from '../../dto/update-business-category.dto';
import { CreateBusinessCategoryDto } from '../../dto/create-business-category.dto';

@Injectable()
export class BusinessCategoriesService {
  private readonly logger = new Logger(BusinessCategoriesService.name);

  constructor(
    @Inject(BUSINESS_CATEGORY_REPOSITORY)
    private readonly businessCategoryRepository: BusinessCategoryRepository,
    private readonly keywordsService: KeywordsService,
  ) {}

  public async getAll(): Promise<BusinessCategory[]> {
    this.logger.debug('Getting all business categories');
    return this.businessCategoryRepository.findAll();
  }

  public async getById(id: string): Promise<BusinessCategory | null> {
    this.logger.debug(`Getting business category ${id}`);
    return this.businessCategoryRepository.findById(id);
  }

  public async create(data: CreateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug('Creating business category');
    const category = BusinessCategory.create({
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds || [],
    });

    return this.businessCategoryRepository.create(category);
  }

  public async update(id: string, data: UpdateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug(`Updating business category ${id}`);
    const existingCategory = await this.businessCategoryRepository.findById(id);
    if (!existingCategory) {
      throw new Error('Business category not found');
    }

    const updatedCategory = existingCategory.update({
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds,
    });

    return this.businessCategoryRepository.update(id, updatedCategory);
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business category ${id}`);
    return this.businessCategoryRepository.delete(id);
  }

  public async getAllWithKeywords(): Promise<BusinessCategory[]> {
    const categories = await this.getAll();

    return Promise.all(
      categories.map(async category => {
        if (category.keywordIds.length > 0) {
          const keywords = await Promise.all(
            category.keywordIds.map(id => this.keywordsService.getById(id)),
          );
          return category.update({ keywords: keywords.filter(keyword => keyword !== null) });
        }
        return category.update({ keywords: [] });
      }),
    );
  }
}
