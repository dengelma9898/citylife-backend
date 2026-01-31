import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
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
  private readonly CACHE_KEY = 'business-categories:all';
  private readonly CACHE_KEY_WITH_KEYWORDS = 'business-categories:all-with-keywords';
  private readonly CACHE_TTL = 600000; // 10 Minuten (Kategorien ändern sich selten)

  constructor(
    @Inject(BUSINESS_CATEGORY_REPOSITORY)
    private readonly businessCategoryRepository: BusinessCategoryRepository,
    private readonly keywordsService: KeywordsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async getAll(): Promise<BusinessCategory[]> {
    // Prüfe zuerst den Cache
    const cached = await this.cacheManager.get<BusinessCategory[]>(this.CACHE_KEY);
    if (cached) {
      this.logger.debug('Cache hit for business categories');
      return cached;
    }
    this.logger.debug('Cache miss for business categories, fetching from DB');
    const categories = await this.businessCategoryRepository.findAll();
    // Speichere im Cache
    await this.cacheManager.set(this.CACHE_KEY, categories, this.CACHE_TTL);
    return categories;
  }

  /**
   * Invalidiert den Cache für alle Business-Kategorien
   */
  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
    await this.cacheManager.del(this.CACHE_KEY_WITH_KEYWORDS);
    this.logger.debug('Business categories cache invalidated');
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
    const result = await this.businessCategoryRepository.create(category);
    // Cache invalidieren nach Erstellung
    await this.invalidateCache();
    return result;
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
    const result = await this.businessCategoryRepository.update(id, updatedCategory);
    // Cache invalidieren nach Update
    await this.invalidateCache();
    return result;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business category ${id}`);
    await this.businessCategoryRepository.delete(id);
    // Cache invalidieren nach Löschung
    await this.invalidateCache();
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
