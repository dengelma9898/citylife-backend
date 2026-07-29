import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { SpotKeyword, normalizeSpotKeywordNameLower } from '../../interfaces/spot-keyword.interface';
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
    return this.toSpotKeyword((doc.data() ?? {}) as Record<string, unknown>, doc.id);
  }

  public async create(dto: CreateSpotKeywordDto): Promise<SpotKeyword> {
    const nameLower = normalizeSpotKeywordNameLower(dto.name);
    const existing = await this.findByNameLower(nameLower);
    if (existing) {
      this.logger.debug(`Spot keyword already exists: ${existing.id}`);
      return existing;
    }
    const now = new Date().toISOString();
    const keyword: SpotKeyword = {
      id: randomUUID(),
      name: dto.name.trim(),
      nameLower,
      createdAt: now,
      updatedAt: now,
    };
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
      const nameLower = normalizeSpotKeywordNameLower(trimmed);
      let keyword = await this.findByNameLower(nameLower);
      if (!keyword) {
        const now = new Date().toISOString();
        keyword = await this.createKeyword({
          id: randomUUID(),
          name: trimmed,
          nameLower,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (!ids.includes(keyword.id)) {
        ids.push(keyword.id);
      }
    }
    return ids;
  }

  private toSpotKeyword(data: Record<string, unknown>, id: string): SpotKeyword {
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
    return this.toSpotKeyword((doc.data() ?? {}) as Record<string, unknown>, doc.id);
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
      this.toSpotKeyword((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  private async createKeyword(keyword: SpotKeyword): Promise<SpotKeyword> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db
      .collection(this.collection)
      .add(toFirestoreData(keyword as unknown as Record<string, unknown>));
    this.logger.log(`Created spot keyword with id: ${docRef.id}`);
    return { ...keyword, id: docRef.id };
  }
}
