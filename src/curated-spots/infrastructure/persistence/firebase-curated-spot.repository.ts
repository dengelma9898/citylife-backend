import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpot, CuratedSpotAddressProps } from '../../domain/entities/curated-spot.entity';
import { CuratedSpotRepository } from '../../domain/repositories/curated-spot.repository';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';

@Injectable()
export class FirebaseCuratedSpotRepository implements CuratedSpotRepository {
  private readonly logger = new Logger(FirebaseCuratedSpotRepository.name);
  private readonly COLLECTION = 'curatedSpots';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: unknown): unknown {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        result[key] = this.removeUndefined((obj as Record<string, unknown>)[key]);
      }
      return result;
    }
    return obj;
  }

  private toPlainObject(entity: CuratedSpot): Omit<ReturnType<CuratedSpot['toJSON']>, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data) as Omit<ReturnType<CuratedSpot['toJSON']>, 'id'>;
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
    return {
      id,
      name: String(data.name ?? ''),
      nameLower: String(data.nameLower ?? ''),
      descriptionMarkdown: String(data.descriptionMarkdown ?? ''),
      imageUrls,
      keywordIds,
      address: this.toAddressProps(data.address),
      videoUrl: data.videoUrl === null || data.videoUrl === undefined ? null : String(data.videoUrl),
      instagramUrl:
        data.instagramUrl === null || data.instagramUrl === undefined ? null : String(data.instagramUrl),
      status: data.status as CuratedSpotStatus,
      isDeleted: data.isDeleted === true,
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
      createdByUserId:
        data.createdByUserId === null || data.createdByUserId === undefined
          ? null
          : String(data.createdByUserId),
    };
  }

  async findAll(): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.COLLECTION).get();
    return snapshot.docs.map(doc =>
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  async findById(id: string): Promise<CuratedSpot | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id));
  }

  async findAllActiveNotDeleted(): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .get();
    return snapshot.docs.map(doc =>
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  async findActiveNotDeletedByKeywordContains(keywordId: string): Promise<CuratedSpot[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .where('keywordIds', 'array-contains', keywordId)
      .get();
    return snapshot.docs.map(doc =>
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  async findActiveNotDeletedByNameLowerPrefix(nameLowerPrefix: string): Promise<CuratedSpot[]> {
    const trimmed = nameLowerPrefix.trim().toLowerCase();
    if (trimmed.length === 0) {
      return [];
    }
    const db = this.firebaseService.getFirestore();
    const upper = `${trimmed}\uf8ff`;
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('status', '==', CuratedSpotStatus.ACTIVE)
      .where('isDeleted', '==', false)
      .where('nameLower', '>=', trimmed)
      .where('nameLower', '<=', upper)
      .get();
    return snapshot.docs.map(doc =>
      CuratedSpot.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  async create(spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.COLLECTION).add(this.toPlainObject(spot));
    this.logger.log(`Created curated spot with id: ${docRef.id}`);
    return CuratedSpot.fromProps({
      ...spot.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, spot: CuratedSpot): Promise<CuratedSpot> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(id);
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
