import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { CuratedSpot, CuratedSpotAddressProps, CuratedSpotProps } from '../../domain/entities/curated-spot.entity';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { CreateCuratedSpotDto } from '../../dto/create-curated-spot.dto';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';
import { SpotKeywordsService } from './spot-keywords.service';
import { normalizeHttpUrlSpaces } from '../../dto/normalize-http-url-spaces';

@Injectable()
export class CuratedSpotsService {
  private readonly logger = new Logger(CuratedSpotsService.name);
  private readonly collection = 'curatedSpots';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly spotKeywordsService: SpotKeywordsService,
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
      const nameLowerPrefix = CuratedSpot.normalizeNameLower(prefix);
      results = results.filter(spot => spot.nameLower.startsWith(nameLowerPrefix));
    }
    return results;
  }

  public async listActiveForApp(): Promise<CuratedSpot[]> {
    return this.findAllActiveNotDeleted();
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
    const spot = CuratedSpot.create({
      name: dto.name,
      descriptionMarkdown: dto.descriptionMarkdown,
      keywordIds: mergedKeywordIds,
      imageUrls: [],
      address: dto.address,
      videoUrl: dto.videoUrl !== undefined ? normalizeHttpUrlSpaces(dto.videoUrl) : null,
      instagramUrl:
        dto.instagramUrl !== undefined ? normalizeHttpUrlSpaces(dto.instagramUrl) : null,
      status: dto.status ?? CuratedSpotStatus.PENDING,
      createdByUserId,
      adminRating: dto.adminRating ?? null,
    });
    return this.createSpot(spot);
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
    const patch: Partial<Omit<CuratedSpotProps, 'id' | 'createdAt'>> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
    }
    if (dto.descriptionMarkdown !== undefined) {
      patch.descriptionMarkdown = dto.descriptionMarkdown;
    }
    if (dto.address !== undefined) {
      patch.address = dto.address;
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
    const updated = existing.update(patch);
    return this.updateSpot(id, updated);
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
    const updated = existing.update({ imageUrls: merged });
    return this.updateSpot(id, updated);
  }

  public async softDelete(id: string): Promise<CuratedSpot> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    const updated = existing.update({ isDeleted: true });
    return this.updateSpot(id, updated);
  }

  private toPlainObject(entity: CuratedSpot): Omit<ReturnType<CuratedSpot['toJSON']>, 'id'> {
    return toFirestoreData(entity);
  }

  private toAddressProps(raw: unknown): CuratedSpotAddressProps {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const lat = o.latitude;
    const lng = o.longitude;
    return {
      street: String(o.street ?? ''),
      houseNumber: String(o.houseNumber ?? ''),
      postalCode: String(o.postalCode ?? ''),
      city: String(o.city ?? ''),
      latitude: typeof lat === 'number' ? lat : Number(lat) || 0,
      longitude: typeof lng === 'number' ? lng : Number(lng) || 0,
    };
  }

  private toProps(data: Record<string, unknown>, id: string): ReturnType<CuratedSpot['toJSON']> {
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
    return {
      id,
      name: String(data.name ?? ''),
      nameLower: String(data.nameLower ?? ''),
      descriptionMarkdown: String(data.descriptionMarkdown ?? ''),
      imageUrls,
      keywordIds,
      address: this.toAddressProps(data.address),
      videoUrl:
        data.videoUrl === null || data.videoUrl === undefined ? null : String(data.videoUrl),
      instagramUrl:
        data.instagramUrl === null || data.instagramUrl === undefined
          ? null
          : String(data.instagramUrl),
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
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  private async findById(id: string): Promise<CuratedSpot | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return CuratedSpot.fromProps(
      this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async findAllActiveNotDeleted(): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map(doc =>
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
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
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  private async findActiveNotDeletedByNameLowerPrefix(nameLowerPrefix: string): Promise<CuratedSpot[]> {
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
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  private async createSpot(spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.collection).add(this.toPlainObject(spot));
    this.logger.log(`Created curated spot with id: ${docRef.id}`);
    return CuratedSpot.fromProps({
      ...spot.toJSON(),
      id: docRef.id,
    });
  }

  private async updateSpot(id: string, spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Curated spot not found');
    }
    await docRef.update(this.toPlainObject(spot));
    this.logger.log(`Updated curated spot with id: ${id}`);
    return CuratedSpot.fromProps({
      ...spot.toJSON(),
      id,
    });
  }
}
