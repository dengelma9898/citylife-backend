import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { randomUUID } from 'node:crypto';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { KidsSpotNotificationData } from '../../../notifications/domain/interfaces/notification-payload.interface';
import {
  CuratedSpot,
  KidsProfile,
  normalizeCuratedSpotNameLower,
  parseCuratedSpotAddress,
  parseKidsProfile,
} from '../../interfaces/curated-spot.interface';
import { KidsSearchFilters } from '../../interfaces/kids-search-filters.interface';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { KidsAgeGroup } from '../../domain/enums/kids-age-group.enum';
import { KidsLocationType } from '../../domain/enums/kids-location-type.enum';
import { CreateCuratedSpotDto } from '../../dto/create-curated-spot.dto';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';
import { KidsSpotsQueryDto } from '../../dto/kids-spots-query.dto';
import { SpotKeywordsService } from './spot-keywords.service';
import { normalizeHttpUrlSpaces } from '../../dto/normalize-http-url-spaces';

@Injectable()
export class CuratedSpotsService {
  private readonly logger = new Logger(CuratedSpotsService.name);
  private readonly collection = 'curatedSpots';
  private readonly KIDS_CACHE_KEY = 'curated-spots:kids:all';
  private readonly KIDS_CACHE_TTL = 300000; // 5 Minuten (Default-TTL, Invalidierung bei Writes)

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly spotKeywordsService: SpotKeywordsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  public static parseKeywordIdsFromQuery(value?: string | string[]): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    const parts: string[] = (Array.isArray(value) ? value : [value]).flatMap(part =>
      String(part)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
    );
    return [...new Set(parts)];
  }

  /**
   * Converts validated kids query parameters into filters. `isFree=false` / `isBadWeatherTip=false`
   * mean "no filter" (the switches only narrow down to the flagged spots).
   */
  public static parseKidsFiltersFromQuery(query: KidsSpotsQueryDto): KidsSearchFilters {
    return {
      locationType: query.locationType,
      ageGroup: query.ageGroup,
      isFree: query.isFree === 'true' ? true : undefined,
      isBadWeatherTip: query.isBadWeatherTip === 'true' ? true : undefined,
    };
  }

  /**
   * A spot is visible in the kids view when it is active, not deleted, carries a kids profile
   * and has at least one photo.
   */
  public static isKidsVisible(spot: CuratedSpot): boolean {
    return (
      spot.status === CuratedSpotStatus.ACTIVE &&
      !spot.isDeleted &&
      spot.kidsProfile !== null &&
      spot.kidsProfile !== undefined &&
      (spot.imageUrls ?? []).length > 0
    );
  }

  /**
   * Active curated spots (app). Optional name prefix and multiple keyword IDs (AND).
   */
  public async searchActive(
    namePrefix?: string,
    keywordIds: string[] = [],
  ): Promise<CuratedSpot[]> {
    const uniqueKeywordIds = [...new Set(keywordIds.filter(id => id.length > 0))];
    const prefix = namePrefix?.trim() ?? '';
    let candidates: CuratedSpot[];
    if (uniqueKeywordIds.length > 0) {
      candidates = await this.findActiveNotDeletedByKeywordContains(uniqueKeywordIds[0]);
    } else if (prefix.length > 0) {
      candidates = await this.findActiveNotDeletedByNameLowerPrefix(prefix);
    } else {
      candidates = await this.findAllActiveNotDeleted();
    }
    let results = candidates;
    if (uniqueKeywordIds.length > 0) {
      results = results.filter(spot =>
        uniqueKeywordIds.every(requiredId => spot.keywordIds.includes(requiredId)),
      );
    }
    if (prefix.length > 0) {
      const nameLowerPrefix = normalizeCuratedSpotNameLower(prefix);
      results = results.filter(spot => spot.nameLower.startsWith(nameLowerPrefix));
    }
    return results;
  }

  public async listActiveForApp(): Promise<CuratedSpot[]> {
    return this.findAllActiveNotDeleted();
  }

  /**
   * Kids view (app): kids-visible spots filtered with AND semantics, sorted by name A-Z.
   * The unfiltered kids-visible list is cached; filtering happens in memory.
   */
  public async searchKids(filters: KidsSearchFilters = {}): Promise<CuratedSpot[]> {
    const kidsSpots = await this.listKidsVisible();
    return kidsSpots.filter(spot => this.matchesKidsFilters(spot.kidsProfile, filters));
  }

  public async listAllForAdmin(): Promise<CuratedSpot[]> {
    const all = await this.findAll();
    return all.filter(s => !s.isDeleted);
  }

  public async getByIdForApp(id: string): Promise<CuratedSpot> {
    const spot = await this.findById(id);
    if (!spot || spot.isDeleted || spot.status !== CuratedSpotStatus.ACTIVE) {
      throw new NotFoundException('Curated spot not found');
    }
    return spot;
  }

  public async getByIdForAdmin(id: string): Promise<CuratedSpot> {
    const spot = await this.findById(id);
    if (!spot) {
      throw new NotFoundException('Curated spot not found');
    }
    return spot;
  }

  public async create(dto: CreateCuratedSpotDto, createdByUserId: string): Promise<CuratedSpot> {
    const baseIds = dto.keywordIds ?? [];
    const fromNames =
      dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0
        ? await this.spotKeywordsService.resolveNewKeywordNamesToIds(dto.newKeywordNames)
        : [];
    const mergedKeywordIds = [...new Set([...baseIds, ...fromNames])];
    const now = new Date().toISOString();
    const adminRating = dto.adminRating ?? null;
    const spot: CuratedSpot = {
      id: randomUUID(),
      name: dto.name.trim(),
      nameLower: normalizeCuratedSpotNameLower(dto.name),
      descriptionMarkdown: dto.descriptionMarkdown,
      imageUrls: [],
      keywordIds: mergedKeywordIds,
      address: parseCuratedSpotAddress(dto.address),
      videoUrl: dto.videoUrl !== undefined ? normalizeHttpUrlSpaces(dto.videoUrl) : null,
      instagramUrl:
        dto.instagramUrl !== undefined ? normalizeHttpUrlSpaces(dto.instagramUrl) : null,
      websiteUrl: dto.websiteUrl !== undefined ? normalizeHttpUrlSpaces(dto.websiteUrl) : null,
      kidsProfile: parseKidsProfile(dto.kidsProfile),
      kidsNotificationSentAt: null,
      status: dto.status ?? CuratedSpotStatus.PENDING,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId,
      adminRating,
      adminRatedAt: adminRating !== null ? now : null,
      userRatingAverage: null,
      userRatingCount: 0,
    };
    const { spot: prepared, shouldNotify } = this.prepareKidsNotification(null, spot);
    const created = await this.createSpot(prepared);
    return this.finalizeWrite(created, shouldNotify);
  }

  public async update(id: string, dto: UpdateCuratedSpotDto): Promise<CuratedSpot> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    let mergedKeywordIds = existing.keywordIds;
    if (dto.keywordIds !== undefined) {
      mergedKeywordIds = [...dto.keywordIds];
    }
    if (dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0) {
      const resolved = await this.spotKeywordsService.resolveNewKeywordNamesToIds(
        dto.newKeywordNames,
      );
      mergedKeywordIds = [...new Set([...mergedKeywordIds, ...resolved])];
    }
    const patch: Partial<CuratedSpot> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
      patch.nameLower = normalizeCuratedSpotNameLower(dto.name);
    }
    if (dto.descriptionMarkdown !== undefined) {
      patch.descriptionMarkdown = dto.descriptionMarkdown;
    }
    if (dto.address !== undefined) {
      patch.address = parseCuratedSpotAddress(dto.address);
    }
    if (
      dto.keywordIds !== undefined ||
      (dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0)
    ) {
      patch.keywordIds = mergedKeywordIds;
    }
    if (dto.videoUrl !== undefined) {
      patch.videoUrl = dto.videoUrl === null ? null : normalizeHttpUrlSpaces(dto.videoUrl);
    }
    if (dto.instagramUrl !== undefined) {
      patch.instagramUrl =
        dto.instagramUrl === null ? null : normalizeHttpUrlSpaces(dto.instagramUrl);
    }
    if (dto.websiteUrl !== undefined) {
      patch.websiteUrl = dto.websiteUrl === null ? null : normalizeHttpUrlSpaces(dto.websiteUrl);
    }
    if (dto.kidsProfile !== undefined) {
      patch.kidsProfile = parseKidsProfile(dto.kidsProfile);
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.isDeleted !== undefined) {
      patch.isDeleted = dto.isDeleted;
    }
    if (dto.adminRating !== undefined && dto.adminRating !== existing.adminRating) {
      patch.adminRating = dto.adminRating;
      patch.adminRatedAt = dto.adminRating === null ? null : new Date().toISOString();
    }
    const updated: CuratedSpot = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return this.persistUpdate(id, existing, updated);
  }

  public async appendImageUrls(id: string, urls: string[]): Promise<CuratedSpot> {
    if (urls.length === 0) {
      throw new BadRequestException('No image URLs provided');
    }
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    const merged = [...(existing.imageUrls ?? []), ...urls];
    const updated: CuratedSpot = {
      ...existing,
      imageUrls: merged,
      updatedAt: new Date().toISOString(),
    };
    return this.persistUpdate(id, existing, updated);
  }

  public async softDelete(id: string): Promise<CuratedSpot> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    const updated: CuratedSpot = {
      ...existing,
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };
    return this.persistUpdate(id, existing, updated);
  }

  private async listKidsVisible(): Promise<CuratedSpot[]> {
    const cached = await this.cacheManager.get<CuratedSpot[]>(this.KIDS_CACHE_KEY);
    if (cached) {
      this.logger.debug('Cache hit for kids curated spots');
      return cached;
    }
    this.logger.debug('Cache miss for kids curated spots, fetching from DB');
    const active = await this.findAllActiveNotDeleted();
    const kidsSpots = active
      .filter(spot => CuratedSpotsService.isKidsVisible(spot))
      .sort((a, b) => a.nameLower.localeCompare(b.nameLower));
    await this.cacheManager.set(this.KIDS_CACHE_KEY, kidsSpots, this.KIDS_CACHE_TTL);
    return kidsSpots;
  }

  private async invalidateKidsCache(): Promise<void> {
    await this.cacheManager.del(this.KIDS_CACHE_KEY);
    this.logger.debug('Kids curated spots cache invalidated');
  }

  private matchesKidsFilters(
    profile: KidsProfile | null | undefined,
    filters: KidsSearchFilters,
  ): boolean {
    if (!profile) {
      return false;
    }
    return (
      this.matchesLocationType(profile.locationType, filters.locationType) &&
      this.matchesAgeGroup(profile, filters.ageGroup) &&
      (filters.isFree !== true || profile.isFree) &&
      (filters.isBadWeatherTip !== true || profile.isBadWeatherTip)
    );
  }

  private matchesLocationType(actual: KidsLocationType, wanted?: KidsLocationType): boolean {
    if (wanted === undefined) {
      return true;
    }
    if (wanted === KidsLocationType.BOTH) {
      return actual === KidsLocationType.BOTH;
    }
    return actual === wanted || actual === KidsLocationType.BOTH;
  }

  private matchesAgeGroup(profile: KidsProfile, wanted?: KidsAgeGroup): boolean {
    if (wanted === undefined) {
      return true;
    }
    return wanted === KidsAgeGroup.TODDLER
      ? profile.suitableForToddlers
      : profile.suitableForSchoolKids;
  }

  /**
   * Detects the transition "not kids-visible -> kids-visible" and, if no push was sent for this
   * spot yet, stamps `kidsNotificationSentAt` so it is persisted in the same Firestore write.
   */
  private prepareKidsNotification(
    previous: CuratedSpot | null,
    next: CuratedSpot,
  ): { spot: CuratedSpot; shouldNotify: boolean } {
    const wasVisible = previous !== null && CuratedSpotsService.isKidsVisible(previous);
    const becameVisible = !wasVisible && CuratedSpotsService.isKidsVisible(next);
    const shouldNotify = becameVisible && !next.kidsNotificationSentAt;
    if (!shouldNotify) {
      return { spot: next, shouldNotify };
    }
    return { spot: { ...next, kidsNotificationSentAt: new Date().toISOString() }, shouldNotify };
  }

  private async persistUpdate(
    id: string,
    existing: CuratedSpot,
    updated: CuratedSpot,
  ): Promise<CuratedSpot> {
    const { spot, shouldNotify } = this.prepareKidsNotification(existing, updated);
    const saved = await this.updateSpot(id, spot);
    return this.finalizeWrite(saved, shouldNotify);
  }

  private async finalizeWrite(saved: CuratedSpot, shouldNotify: boolean): Promise<CuratedSpot> {
    await this.invalidateKidsCache();
    if (shouldNotify) {
      await this.sendNewKidsSpotNotification(saved);
    }
    return saved;
  }

  private async sendNewKidsSpotNotification(spot: CuratedSpot): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting new kids spot notification for spot ${spot.id}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      const userIds = allUsers
        .filter(({ profile }) => profile.notificationPreferences?.newKidsSpots === true)
        .map(({ id }) => id);
      if (userIds.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for kids spot ${spot.id}`);
        return;
      }
      const data = {
        type: 'NEW_KIDS_SPOT',
        spotId: spot.id,
        spotName: spot.name,
      } satisfies KidsSpotNotificationData;
      await this.notificationService.sendToUsers(userIds, {
        title: 'Neuer Kids-Spot',
        body: `${spot.name} ist jetzt in den Kids-Spots verfügbar`,
        data,
      });
      this.logger.log(
        `[NOTIFICATION] Completed kids spot notification for spot ${spot.id}. Sent to ${userIds.length} users.`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[NOTIFICATION] Error sending kids spot notification for spot ${spot.id}: ${err.message}`,
        err.stack,
      );
    }
  }

  private toCuratedSpot(data: Record<string, unknown>, id: string): CuratedSpot {
    const imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls.map(String) : [];
    const keywordIds = Array.isArray(data.keywordIds) ? data.keywordIds.map(String) : [];
    const adminRating = this.readOptionalRating(data.adminRating);
    const userRatingAverage = this.readOptionalAverage(data.userRatingAverage);
    const userRatingCountRaw = data.userRatingCount;
    const userRatingCount =
      typeof userRatingCountRaw === 'number' ? userRatingCountRaw : Number(userRatingCountRaw) || 0;
    const adminRatedAt =
      data.adminRatedAt === null || data.adminRatedAt === undefined
        ? null
        : String(data.adminRatedAt);
    const kidsProfile = parseKidsProfile(data.kidsProfile);
    return {
      id,
      name: String(data.name ?? ''),
      nameLower: String(data.nameLower ?? ''),
      descriptionMarkdown: String(data.descriptionMarkdown ?? ''),
      imageUrls,
      keywordIds,
      address: parseCuratedSpotAddress(data.address),
      videoUrl:
        data.videoUrl === null || data.videoUrl === undefined ? null : String(data.videoUrl),
      instagramUrl:
        data.instagramUrl === null || data.instagramUrl === undefined
          ? null
          : String(data.instagramUrl),
      websiteUrl:
        data.websiteUrl === null || data.websiteUrl === undefined ? null : String(data.websiteUrl),
      kidsProfile,
      isKidsSpot: kidsProfile !== null,
      kidsNotificationSentAt:
        data.kidsNotificationSentAt === null || data.kidsNotificationSentAt === undefined
          ? null
          : String(data.kidsNotificationSentAt),
      status: data.status as CuratedSpotStatus,
      isDeleted: data.isDeleted === true,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
      createdByUserId:
        data.createdByUserId === null || data.createdByUserId === undefined
          ? null
          : String(data.createdByUserId),
      adminRating,
      adminRatedAt,
      userRatingAverage,
      userRatingCount,
    };
  }

  private readOptionalRating(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private readOptionalAverage(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
  }

  private async findAll(): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map(doc =>
      this.toCuratedSpot((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async findById(id: string): Promise<CuratedSpot | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return this.toCuratedSpot((doc.data() ?? {}) as Record<string, unknown>, doc.id);
  }

  private async findAllActiveNotDeleted(): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map(doc =>
      this.toCuratedSpot((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async findActiveNotDeletedByKeywordContains(keywordId: string): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .where('keywordIds', 'array-contains', keywordId)
      .get();
    return snapshot.docs.map(doc =>
      this.toCuratedSpot((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async findActiveNotDeletedByNameLowerPrefix(
    nameLowerPrefix: string,
  ): Promise<CuratedSpot[]> {
    const trimmed = nameLowerPrefix.trim().toLowerCase();
    if (trimmed.length === 0) {
      return [];
    }
    const db = this.firebaseService.getFirestore();
    const upper = `${trimmed}\uf8ff`;
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .where('nameLower', '>=', trimmed)
      .where('nameLower', '<=', upper)
      .get();
    return snapshot.docs.map(doc =>
      this.toCuratedSpot((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  /** Persistable form of a spot: derived fields (`isKidsSpot`) are never stored. */
  private toStoredData(spot: CuratedSpot): Record<string, unknown> {
    const stored: Partial<CuratedSpot> = { ...spot };
    delete stored.isKidsSpot;
    return toFirestoreData(stored);
  }

  private withDerivedFields(spot: CuratedSpot, id: string): CuratedSpot {
    return { ...spot, id, isKidsSpot: spot.kidsProfile !== null && spot.kidsProfile !== undefined };
  }

  private async createSpot(spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.collection).add(this.toStoredData(spot));
    this.logger.log(`Created curated spot with id: ${docRef.id}`);
    return this.withDerivedFields(spot, docRef.id);
  }

  private async updateSpot(id: string, spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Curated spot not found');
    }
    await docRef.update(this.toStoredData(spot));
    this.logger.log(`Updated curated spot with id: ${id}`);
    return this.withDerivedFields(spot, id);
  }
}
