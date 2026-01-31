import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventCategory } from '../interfaces/event-category.interface';
import { CreateEventCategoryDto } from '../dto/create-event-category.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class EventCategoriesService {
  private readonly logger = new Logger(EventCategoriesService.name);
  private readonly collection = 'event_categories';
  private readonly CACHE_KEY = 'event-categories:all';
  private readonly CACHE_TTL = 600000; // 10 Minuten (Kategorien ändern sich selten)

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

  public async findAll(): Promise<EventCategory[]> {
    try {
      // Prüfe zuerst den Cache
      const cached = await this.cacheManager.get<EventCategory[]>(this.CACHE_KEY);
      if (cached) {
        this.logger.debug('Cache hit for event categories');
        return cached;
      }
      this.logger.debug('Cache miss for event categories, fetching from DB');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();
      const categories = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as EventCategory,
      );
      // Speichere im Cache
      await this.cacheManager.set(this.CACHE_KEY, categories, this.CACHE_TTL);
      return categories;
    } catch (error) {
      this.logger.error(`Error finding all event categories: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalidiert den Cache für alle Event-Kategorien
   */
  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
    this.logger.debug('Event categories cache invalidated');
  }

  public async findOne(id: string): Promise<EventCategory | null> {
    try {
      this.logger.debug(`Getting event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as EventCategory;
    } catch (error) {
      this.logger.error(`Error finding event category ${id}: ${error.message}`);
      throw error;
    }
  }

  public async create(data: CreateEventCategoryDto): Promise<EventCategory> {
    try {
      this.logger.debug('Creating event category');
      const db = this.firebaseService.getFirestore();
      const categoryData: Omit<EventCategory, 'id'> = {
        name: data.name,
        description: data.description,
        colorCode: data.colorCode,
        iconName: data.iconName,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      const docRef = await db.collection(this.collection).add(this.removeUndefined(categoryData));
      // Cache invalidieren nach Erstellung
      await this.invalidateCache();
      return {
        id: docRef.id,
        ...categoryData,
      };
    } catch (error) {
      this.logger.error(`Error creating event category: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, data: Partial<CreateEventCategoryDto>): Promise<EventCategory> {
    try {
      this.logger.debug(`Updating event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException('Event category not found');
      }
      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      // Cache invalidieren nach Update
      await this.invalidateCache();
      const updatedDoc = await db.collection(this.collection).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as EventCategory;
    } catch (error) {
      this.logger.error(`Error updating event category ${id}: ${error.message}`);
      throw error;
    }
  }

  public async remove(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException('Event category not found');
      }
      await db.collection(this.collection).doc(id).delete();
      // Cache invalidieren nach Löschung
      await this.invalidateCache();
    } catch (error) {
      this.logger.error(`Error deleting event category ${id}: ${error.message}`);
      throw error;
    }
  }
}
