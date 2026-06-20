import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';
import { SpotKeywordRepository } from '../../domain/repositories/spot-keyword.repository';

import { removeUndefined, toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseSpotKeywordRepository implements SpotKeywordRepository {
  private readonly logger = new Logger(FirebaseSpotKeywordRepository.name);
  private readonly COLLECTION = 'spotKeywords';

  constructor(private readonly firebaseService: FirebaseService) {}

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

  async findById(id: string): Promise<SpotKeyword | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return SpotKeyword.fromProps(
      this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id),
    );
  }

  async findByNameLower(nameLower: string): Promise<SpotKeyword | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION)
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

  async suggestByNameLowerPrefix(prefix: string, limit: number): Promise<SpotKeyword[]> {
    const trimmed = prefix.trim().toLowerCase();
    if (trimmed.length === 0) {
      return [];
    }
    const db = this.firebaseService.getFirestore();
    const upper = `${trimmed}\uf8ff`;
    const snapshot = await db
      .collection(this.COLLECTION)
      .where('nameLower', '>=', trimmed)
      .where('nameLower', '<=', upper)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc =>
      SpotKeyword.fromProps(this.toProps((doc.data() ?? {}) as Record<string, unknown>, doc.id)),
    );
  }

  async create(keyword: SpotKeyword): Promise<SpotKeyword> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.COLLECTION).add(this.toPlainObject(keyword));
    this.logger.log(`Created spot keyword with id: ${docRef.id}`);
    return SpotKeyword.fromProps({
      ...keyword.toJSON(),
      id: docRef.id,
    });
  }
}
