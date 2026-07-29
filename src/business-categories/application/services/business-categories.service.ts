import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { randomUUID } from 'node:crypto';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { BusinessCategory } from '../../interfaces/business-category.interface';
import { KeywordsService } from '../../../keywords/keywords.service';
import { UpdateBusinessCategoryDto } from '../../dto/update-business-category.dto';
import { CreateBusinessCategoryDto } from '../../dto/create-business-category.dto';

@Injectable()
export class BusinessCategoriesService {
  private readonly logger = new Logger(BusinessCategoriesService.name);
  private readonly collection = 'business_categories';
  private readonly CACHE_KEY = 'business-categories:all';
  private readonly CACHE_KEY_WITH_KEYWORDS = 'business-categories:all-with-keywords';
  private readonly CACHE_TTL = 600000;

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly keywordsService: KeywordsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private toBusinessCategory(data: Record<string, unknown>, id: string): BusinessCategory {
    return {
      id,
      name: data.name as string,
      iconName: data.iconName as string,
      description: data.description as string,
      keywordIds: (data.keywordIds as string[]) || [],
      keywords: data.keywords as BusinessCategory['keywords'],
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  private async findAllCategories(): Promise<BusinessCategory[]> {
    this.logger.debug('Getting all business categories');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map(doc =>
      this.toBusinessCategory(doc.data() as Record<string, unknown>, doc.id),
    );
  }

  private async findCategoryById(id: string): Promise<BusinessCategory | null> {
    this.logger.debug(`Getting business category ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toBusinessCategory(doc.data() as Record<string, unknown>, doc.id);
  }

  public async getAll(): Promise<BusinessCategory[]> {
    const cached = await this.cacheManager.get<BusinessCategory[]>(this.CACHE_KEY);
    if (cached) {
      this.logger.debug('Cache hit for business categories');
      return cached;
    }
    this.logger.debug('Cache miss for business categories, fetching from DB');
    const categories = await this.findAllCategories();
    await this.cacheManager.set(this.CACHE_KEY, categories, this.CACHE_TTL);
    return categories;
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
    await this.cacheManager.del(this.CACHE_KEY_WITH_KEYWORDS);
    this.logger.debug('Business categories cache invalidated');
  }

  public async getById(id: string): Promise<BusinessCategory | null> {
    this.logger.debug(`Getting business category ${id}`);
    return this.findCategoryById(id);
  }

  public async create(data: CreateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug('Creating business category');
    const now = new Date().toISOString();
    const category: Omit<BusinessCategory, 'id'> = {
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds || [],
      createdAt: now,
      updatedAt: now,
    };
    const db = this.firebaseService.getFirestore();
    const docRef = await db
      .collection(this.collection)
      .add(toFirestoreData(category as unknown as Record<string, unknown>));
    const created: BusinessCategory = { ...category, id: docRef.id };
    await this.invalidateCache();
    return created;
  }

  public async update(id: string, data: UpdateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug(`Updating business category ${id}`);
    const existingCategory = await this.findCategoryById(id);
    if (!existingCategory) {
      throw new Error('Business category not found');
    }
    const updatedCategory: BusinessCategory = {
      ...existingCategory,
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds,
      updatedAt: new Date().toISOString(),
    };
    const db = this.firebaseService.getFirestore();
    await db
      .collection(this.collection)
      .doc(id)
      .update(toFirestoreData(updatedCategory as unknown as Record<string, unknown>));
    await this.invalidateCache();
    return updatedCategory;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business category ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Business category not found');
    }
    await db.collection(this.collection).doc(id).delete();
    await this.invalidateCache();
  }

  public async getAllWithKeywords(): Promise<BusinessCategory[]> {
    const categories = await this.getAll();
    return Promise.all(
      categories.map(async category => {
        if (category.keywordIds.length > 0) {
          const keywords = await Promise.all(
            category.keywordIds.map(keywordId => this.keywordsService.getById(keywordId)),
          );
          return {
            ...category,
            keywords: keywords.filter(keyword => keyword !== null),
          };
        }
        return { ...category, keywords: [] };
      }),
    );
  }
}
