import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { DateTimeUtils } from '../utils/date-time.utils';

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);
  private readonly collection = 'keywords';
  private readonly CACHE_KEY = 'keywords:all';
  private readonly CACHE_TTL = 600000;

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  public async getAll(): Promise<Keyword[]> {
    try {
      const cached = await this.cacheManager.get<Keyword[]>(this.CACHE_KEY);
      if (cached) {
        this.logger.debug('Cache hit for keywords');
        return cached;
      }
      this.logger.debug('Cache miss for keywords, fetching from DB');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();
      const keywords = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Keyword,
      );
      await this.cacheManager.set(this.CACHE_KEY, keywords, this.CACHE_TTL);
      return keywords;
    } catch (error) {
      this.logger.error(`Error getting all keywords: ${error.message}`);
      throw error;
    }
  }

  public async getById(id: string): Promise<Keyword | null> {
    try {
      this.logger.debug(`Getting keyword ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data(),
      } as Keyword;
    } catch (error) {
      this.logger.error(`Error getting keyword ${id}: ${error.message}`);
      throw error;
    }
  }

  public async create(data: CreateKeywordDto): Promise<Keyword> {
    try {
      this.logger.debug('Creating keyword');
      const db = this.firebaseService.getFirestore();
      const keywordData: Omit<Keyword, 'id'> = {
        name: data.name,
        description: data.description,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      const docRef = await db.collection(this.collection).add(this.removeUndefined(keywordData));
      await this.invalidateCache();
      return {
        id: docRef.id,
        ...keywordData,
      };
    } catch (error) {
      this.logger.error(`Error creating keyword: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, data: UpdateKeywordDto): Promise<Keyword> {
    try {
      this.logger.debug(`Updating keyword ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException('Keyword not found');
      }
      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      await this.invalidateCache();
      const updatedDoc = await db.collection(this.collection).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as Keyword;
    } catch (error) {
      this.logger.error(`Error updating keyword ${id}: ${error.message}`);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting keyword ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException('Keyword not found');
      }
      await db.collection(this.collection).doc(id).delete();
      await this.invalidateCache();
    } catch (error) {
      this.logger.error(`Error deleting keyword ${id}: ${error.message}`);
      throw error;
    }
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
    this.logger.debug('Keywords cache invalidated');
  }
}
