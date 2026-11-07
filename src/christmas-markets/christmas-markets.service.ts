import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FirebaseService } from '../firebase/firebase.service';
import { removeUndefined } from '../firebase/firebase-mapper.util';
import { DateTimeUtils } from '../utils/date-time.utils';
import { ChristmasMarket } from './interfaces/christmas-market.interface';
import { CreateChristmasMarketDto } from './dto/create-christmas-market.dto';
import { UpdateChristmasMarketDto } from './dto/update-christmas-market.dto';

/**
 * CRUD for seasonal Christmas markets (Firestore `christmasMarkets`).
 * Read-heavy list/detail endpoints are cached for 15 minutes; writes invalidate.
 */
@Injectable()
export class ChristmasMarketsService {
  private readonly logger = new Logger(ChristmasMarketsService.name);
  private readonly collectionName = 'christmasMarkets';
  private readonly cacheKeyAll = 'christmas-markets:all';
  private readonly cacheTtl = 900000; // 15 Minuten (wie Feature-Flags/App-Settings)

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async findAll(): Promise<ChristmasMarket[]> {
    const cached = await this.cacheManager.get<ChristmasMarket[]>(this.cacheKeyAll);
    if (cached) {
      this.logger.debug('Cache hit for christmas markets list');
      return cached;
    }
    this.logger.debug('Cache miss for christmas markets list, fetching from DB');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();
    const markets = snapshot.docs.map(doc =>
      this.mapDocument(doc.id, doc.data() as Record<string, unknown>),
    );
    markets.sort((a, b) => this.compareByStartDate(a, b));
    await this.cacheManager.set(this.cacheKeyAll, markets, this.cacheTtl);
    return markets;
  }

  public async findOne(id: string): Promise<ChristmasMarket> {
    const cacheKey = this.cacheKeyForId(id);
    const cached = await this.cacheManager.get<ChristmasMarket>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for christmas market ${id}`);
      return cached;
    }
    this.logger.debug(`Cache miss for christmas market ${id}, fetching from DB`);
    const market = await this.fetchOne(id);
    await this.cacheManager.set(cacheKey, market, this.cacheTtl);
    return market;
  }

  public async create(dto: CreateChristmasMarketDto, userId: string): Promise<ChristmasMarket> {
    this.assertValidDateRange(dto.startDate, dto.endDate);
    const db = this.firebaseService.getFirestore();
    const collection = db.collection(this.collectionName);
    if (dto.id) {
      const existing = await collection.doc(dto.id).get();
      if (existing.exists)
        throw new ConflictException(`Christmas market "${dto.id}" already exists`);
    }
    const now = DateTimeUtils.getBerlinTime();
    const market: ChristmasMarket = {
      id: dto.id ?? '',
      name: dto.name,
      city: dto.city,
      place: dto.place,
      description: dto.description,
      periodLabel: dto.periodLabel,
      openingHoursLabel: dto.openingHoursLabel,
      startDate: dto.startDate,
      endDate: dto.endDate,
      latitude: dto.latitude,
      longitude: dto.longitude,
      imageUrl: dto.imageUrl,
      highlights: dto.highlights ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };
    const writeData = this.toWriteData(market);
    const docRef = dto.id ? collection.doc(dto.id) : await collection.add(writeData);
    if (dto.id) await docRef.set(writeData);
    const created: ChristmasMarket = { ...market, id: docRef.id };
    await this.invalidateCache(created.id);
    return created;
  }

  public async update(
    id: string,
    dto: UpdateChristmasMarketDto,
    userId: string,
  ): Promise<ChristmasMarket> {
    const existing = await this.fetchOne(id);
    this.assertValidDateRange(dto.startDate ?? existing.startDate, dto.endDate ?? existing.endDate);
    const db = this.firebaseService.getFirestore();
    const updateData = this.toUpdateData(dto, userId);
    await db.collection(this.collectionName).doc(id).update(updateData);
    await this.invalidateCache(id);
    return this.findOne(id);
  }

  public async remove(id: string): Promise<void> {
    await this.fetchOne(id);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).doc(id).delete();
    await this.invalidateCache(id);
  }

  private async fetchOne(id: string): Promise<ChristmasMarket> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) throw new NotFoundException(`Christmas market "${id}" not found`);
    return this.mapDocument(doc.id, doc.data() as Record<string, unknown>);
  }

  private cacheKeyForId(id: string): string {
    return `christmas-markets:${id}`;
  }

  private async invalidateCache(id: string): Promise<void> {
    await this.cacheManager.del(this.cacheKeyAll);
    await this.cacheManager.del(this.cacheKeyForId(id));
    this.logger.debug(`Christmas markets cache invalidated (all, ${id})`);
  }

  private compareByStartDate(a: ChristmasMarket, b: ChristmasMarket): number {
    const startA = a.startDate ? Date.parse(a.startDate) : Number.POSITIVE_INFINITY;
    const startB = b.startDate ? Date.parse(b.startDate) : Number.POSITIVE_INFINITY;
    if (startA !== startB) return startA - startB;
    return a.name.localeCompare(b.name);
  }

  private assertValidDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate && Date.parse(endDate) < Date.parse(startDate)) {
      throw new BadRequestException('endDate must not be before startDate');
    }
  }

  /** Converts API dates to `Date` (Firestore stores them as Timestamp); `removeUndefined` must not see `Date` objects. */
  private toWriteData(market: ChristmasMarket): Record<string, unknown> {
    const { id, startDate, endDate, createdAt, updatedAt, ...rest } = market;
    void id;
    return {
      ...removeUndefined(rest),
      ...(startDate ? { startDate: new Date(startDate) } : { startDate: null }),
      ...(endDate ? { endDate: new Date(endDate) } : { endDate: null }),
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
    };
  }

  private toUpdateData(dto: UpdateChristmasMarketDto, userId: string): Record<string, unknown> {
    const { startDate, endDate, ...rest } = dto;
    const definedRest = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    );
    return {
      ...removeUndefined(definedRest),
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      updatedAt: new Date(DateTimeUtils.getBerlinTime()),
      updatedBy: userId,
    };
  }

  private mapDocument(id: string, data: Record<string, unknown>): ChristmasMarket {
    return {
      id,
      name: String(data.name ?? ''),
      city: String(data.city ?? ''),
      place: String(data.place ?? ''),
      description: String(data.description ?? ''),
      periodLabel: String(data.periodLabel ?? ''),
      openingHoursLabel: String(data.openingHoursLabel ?? ''),
      startDate: this.toIsoString(data.startDate),
      endDate: this.toIsoString(data.endDate),
      latitude: Number(data.latitude ?? 0),
      longitude: Number(data.longitude ?? 0),
      imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
      highlights: Array.isArray(data.highlights)
        ? data.highlights.filter((item): item is string => typeof item === 'string')
        : [],
      createdAt: this.toIsoString(data.createdAt) ?? '',
      updatedAt: this.toIsoString(data.updatedAt) ?? '',
      createdBy: data.createdBy ? String(data.createdBy) : undefined,
      updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
    };
  }

  private toIsoString(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && 'toDate' in value) {
      const toDate = (value as { toDate: () => Date }).toDate;
      if (typeof toDate === 'function') return toDate.call(value).toISOString();
    }
    return String(value);
  }
}
