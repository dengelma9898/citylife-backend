import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { FeatureFlag } from '../../domain/enums/feature-flag.enum';
import {
  FeatureFlagSettings,
  FeatureFlagsResponse,
} from '../../interfaces/feature-flag-settings.interface';

interface FeatureFlagDefinition {
  documentId: string;
  defaultEnabled: boolean;
}

/**
 * Stores the product feature flags in Firestore (`settings` collection, one document per flag).
 * The backend deliberately does not enforce the flags; clients decide what to show or hide.
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private readonly collectionName = 'settings';
  private readonly CACHE_KEY_PREFIX = 'feature-flags:';
  private readonly CACHE_TTL = 900000; // 15 Minuten (wie App-Settings, Invalidierung bei Writes)

  private static readonly DEFINITIONS: Record<FeatureFlag, FeatureFlagDefinition> = {
    // Community runs live today, so it stays on until the editorial team switches over.
    [FeatureFlag.COMMUNITY]: { documentId: 'community_settings', defaultEnabled: true },
    // Kids spots are new and stay off until activated deliberately.
    [FeatureFlag.KIDS_SPOTS]: { documentId: 'kids_spots_settings', defaultEnabled: false },
    // Christmas markets are seasonal and stay off until the app rollout is ready.
    [FeatureFlag.CHRISTMAS_MARKETS]: {
      documentId: 'christmas_markets_settings',
      defaultEnabled: false,
    },
  };

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /** Returns all flags in one payload so clients can decide which feature to show. */
  public async getAllFlags(): Promise<FeatureFlagsResponse> {
    const [community, kidsSpots, christmasMarkets] = await Promise.all([
      this.getFlag(FeatureFlag.COMMUNITY),
      this.getFlag(FeatureFlag.KIDS_SPOTS),
      this.getFlag(FeatureFlag.CHRISTMAS_MARKETS),
    ]);
    return { community, kidsSpots, christmasMarkets };
  }

  public async getFlag(flag: FeatureFlag): Promise<FeatureFlagSettings> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${flag}`;
    const cached = await this.cacheManager.get<FeatureFlagSettings>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for feature flag ${flag}`);
      return cached;
    }
    this.logger.debug(`Cache miss for feature flag ${flag}, fetching from DB`);
    const settings = await this.getFromFirestore(flag);
    await this.cacheManager.set(cacheKey, settings, this.CACHE_TTL);
    return settings;
  }

  public async updateFlag(
    flag: FeatureFlag,
    isEnabled: boolean,
    updatedBy?: string,
  ): Promise<FeatureFlagSettings> {
    this.logger.debug(
      `Updating feature flag ${flag}: isEnabled=${isEnabled}, updatedBy=${updatedBy}`,
    );
    const current = await this.getFromFirestore(flag);
    const updated: FeatureFlagSettings = {
      ...current,
      isEnabled,
      updatedBy: updatedBy || current.updatedBy,
      updatedAt: new Date().toISOString(),
    };
    const saved = await this.saveToFirestore(updated);
    await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}${flag}`);
    this.logger.debug(`Feature flag ${flag} cache invalidated`);
    return saved;
  }

  private async getFromFirestore(flag: FeatureFlag): Promise<FeatureFlagSettings> {
    try {
      const { documentId, defaultEnabled } = FeatureFlagsService.DEFINITIONS[flag];
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(documentId).get();
      if (!doc.exists) {
        const defaultSettings: FeatureFlagSettings = {
          id: documentId,
          isEnabled: defaultEnabled,
          updatedAt: new Date().toISOString(),
        };
        await this.saveToFirestore(defaultSettings);
        return defaultSettings;
      }
      return this.toSettings((doc.data() ?? {}) as Record<string, unknown>, doc.id, defaultEnabled);
    } catch (error) {
      this.logger.error(`Error getting feature flag ${flag}: ${error.message}`);
      throw error;
    }
  }

  private async saveToFirestore(settings: FeatureFlagSettings): Promise<FeatureFlagSettings> {
    try {
      const db = this.firebaseService.getFirestore();
      await db
        .collection(this.collectionName)
        .doc(settings.id)
        .set(toFirestoreData(settings as unknown as Record<string, unknown>));
      return settings;
    } catch (error) {
      this.logger.error(`Error saving feature flag ${settings.id}: ${error.message}`);
      throw error;
    }
  }

  private toSettings(
    data: Record<string, unknown>,
    id: string,
    defaultEnabled: boolean,
  ): FeatureFlagSettings {
    const updatedAtRaw = data.updatedAt;
    const updatedAt =
      updatedAtRaw &&
      typeof updatedAtRaw === 'object' &&
      'toDate' in updatedAtRaw &&
      typeof (updatedAtRaw as { toDate: () => Date }).toDate === 'function'
        ? (updatedAtRaw as { toDate: () => Date }).toDate().toISOString()
        : String(updatedAtRaw ?? new Date().toISOString());
    return {
      id,
      isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : defaultEnabled,
      updatedAt,
      updatedBy:
        data.updatedBy === undefined || data.updatedBy === null
          ? undefined
          : String(data.updatedBy),
    };
  }
}
