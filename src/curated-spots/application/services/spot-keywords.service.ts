import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';
import { CreateSpotKeywordDto } from '../../dto/create-spot-keyword.dto';

@Injectable()
export class SpotKeywordsService {
  private readonly logger = new Logger(SpotKeywordsService.name);
  private readonly collection = 'spotKeywords';

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Returns existing spot keywords whose nameLower has the given prefix (Firestore range query).
   */
  public async suggestByPrefix(prefix: string, limit: number = 20): Promise<SpotKeyword[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    return this.suggestByNameLowerPrefix(prefix, safeLimit);
  }

  public async findById(id: string): Promise<SpotKeyword | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return SpotKeyword.fromProps(
      this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  public async create(dto: CreateSpotKeywordDto): Promise<SpotKeyword> {
    const nameLower = SpotKeyword.normalizeNameLower(dto.name);
    const existing = await this.findByNameLower(nameLower);
    if (existing) {
      this.logger.debug(`Spot keyword already exists: ${existing.id}`);
      return existing;
    }
    const keyword = SpotKeyword.create({ name: dto.name });
    return this.createKeyword(keyword);
  }

  /**
   * Resolves display names to spot keyword document IDs, creating missing keywords.
   */
  public async resolveNewKeywordNamesToIds(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const raw of names) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const nameLower = SpotKeyword.normalizeNameLower(trimmed);
      let keyword = await this.findByNameLower(nameLower);
      if (!keyword) {
        keyword = await this.createKeyword(SpotKeyword.create({ name: trimmed }));
      }
      if (!ids.includes(keyword.id)) {
        ids.push(keyword.id);
      }
    }
    return ids;
  }

  private toPlainObject(entity: SpotKeyword): Omit<ReturnType<SpotKeyword['toJSON']>, 'id'> {
    return toFirestoreData(entity);
  }

  private toProps(data: Record<string, unknown>, id: string): ReturnType<SpotKeyword['toJSON']> {
    return {
      id,
      name: String(data.name ?? ''),
      nameLower: String(data.nameLower ?? ''),
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
    };
  }

  private async findByNameLower(nameLower: string): Promise<SpotKeyword | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('nameLower', '==', nameLower)
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return SpotKeyword.fromProps(
      this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async suggestByNameLowerPrefix(prefix: string, limit: number): Promise<SpotKeyword[]> {
    const trimmed = prefix.trim().toLowerCase();
    if (trimmed.length === 0) {
      return [];
    }
    const db = this.firebaseService.getFirestore();
    const upper = `${trimmed}\uf8ff`;
    const snapshot = await db
      .collection(this.collection)
      .where('nameLower', '>=', trimmed)
      .where('nameLower', '<=', upper)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc =>
      SpotKeyword.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  private async createKeyword(keyword: SpotKeyword): Promise<SpotKeyword> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.collection).add(this.toPlainObject(keyword));
    this.logger.log(`Created spot keyword with id: ${docRef.id}`);
    return SpotKeyword.fromProps({
      ...keyword.toJSON(),
      id: docRef.id,
    });
  }
}
