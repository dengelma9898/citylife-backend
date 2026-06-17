import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Preference } from './interfaces/preference.interface';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);
  private readonly CACHE_KEY_ALL = 'app-settings:all';
  private readonly CACHE_KEY_PREFIX = 'app-settings:';
  private readonly CACHE_TTL = 900000;

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  public async getAll(): Promise<Preference[]> {
    const cached = await this.cacheManager.get<Preference[]>(this.CACHE_KEY_ALL);
    if (cached) {
      this.logger.debug('Cache hit for app settings');
      return cached;
    }
    this.logger.debug('Cache miss for app settings, fetching from DB');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('app_settings').get();
    const preferences = snapshot.docs.map(doc => ({
      id: doc.id,
      preferences: doc.data().preferences || [],
    }));
    await this.cacheManager.set(this.CACHE_KEY_ALL, preferences, this.CACHE_TTL);
    return preferences;
  }

  public async getById(id: string): Promise<Preference | null> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${id}`;
    const cached = await this.cacheManager.get<Preference>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for app settings ${id}`);
      return cached;
    }
    this.logger.debug(`Cache miss for app settings ${id}, fetching from DB`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('app_settings').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const preference: Preference = {
      id: doc.id,
      preferences: doc.data()?.preferences || [],
    };
    await this.cacheManager.set(cacheKey, preference, this.CACHE_TTL);
    return preference;
  }

  private async invalidateCache(id?: string): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY_ALL);
    if (id) {
      await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}${id}`);
    }
    this.logger.debug('App settings cache invalidated');
  }
}
