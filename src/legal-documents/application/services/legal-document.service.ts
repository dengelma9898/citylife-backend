import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { LegalDocument, LegalDocumentProps, LegalDocumentType } from '../../domain/entities/legal-document.entity';

@Injectable()
export class LegalDocumentService {
  private readonly logger = new Logger(LegalDocumentService.name);
  private readonly collection = 'legal_documents';
  private readonly CACHE_KEY_PREFIX = 'legal-documents:latest:';
  private readonly CACHE_TTL = 900000;

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private toEntityProps(data: Record<string, unknown>, id: string): LegalDocumentProps {
    return {
      id,
      type: data.type as LegalDocumentType,
      content: data.content as string,
      version: (data.version as number) || 1,
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      createdBy: data.createdBy as string,
      isActive: data.isActive !== undefined ? (data.isActive as boolean) : true,
    };
  }

  private async saveDocument(document: LegalDocument): Promise<LegalDocument> {
    this.logger.debug(`Saving legal document ${document.id} of type ${document.type}`);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(document.id).set(toFirestoreData(document));
    return document;
  }

  private async findByIdInternal(id: string): Promise<LegalDocument | null> {
    this.logger.debug(`Finding legal document with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return LegalDocument.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id));
  }

  private async findByTypeInternal(type: LegalDocumentType): Promise<LegalDocument[]> {
    this.logger.debug(`Finding legal documents of type: ${type}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).where('type', '==', type).get();
    return snapshot.docs.map(doc =>
      LegalDocument.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async findLatestByTypeInternal(type: LegalDocumentType): Promise<LegalDocument | null> {
    this.logger.debug(`Finding latest legal document of type: ${type}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('type', '==', type)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) {
      return null;
    }
    return LegalDocument.fromProps(
      this.toEntityProps(snapshot.docs[0].data() as Record<string, unknown>, snapshot.docs[0].id),
    );
  }

  async create(
    type: LegalDocumentType,
    content: string,
    createdBy: string,
  ): Promise<LegalDocument> {
    this.logger.log(`Creating new legal document of type ${type}`);
    const latestDocument = await this.findLatestByTypeInternal(type);
    const nextVersion = latestDocument ? latestDocument.version + 1 : 1;
    const newDocument = LegalDocument.createWithVersion({
      type,
      content,
      createdBy,
      version: nextVersion,
    });
    const saved = await this.saveDocument(newDocument);
    await this.invalidateCache(type);
    return saved;
  }

  async getLatestByType(type: LegalDocumentType): Promise<LegalDocument> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${type}`;
    const cached = await this.cacheManager.get<LegalDocument>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for latest legal document type ${type}`);
      return cached;
    }
    this.logger.debug(`Cache miss for latest legal document type ${type}, fetching from DB`);
    const document = await this.findLatestByTypeInternal(type);
    if (!document) {
      throw new NotFoundException(`No legal document found for type ${type}`);
    }
    await this.cacheManager.set(cacheKey, document, this.CACHE_TTL);
    return document;
  }

  async getAllByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    this.logger.log(`Getting all legal documents of type ${type}`);
    return this.findByTypeInternal(type);
  }

  async getById(id: string): Promise<LegalDocument> {
    this.logger.log(`Getting legal document with id ${id}`);
    const document = await this.findByIdInternal(id);
    if (!document) {
      throw new NotFoundException(`Legal document with id ${id} not found`);
    }
    return document;
  }

  private async invalidateCache(type: LegalDocumentType): Promise<void> {
    await this.cacheManager.del(`${this.CACHE_KEY_PREFIX}${type}`);
    this.logger.debug(`Legal document cache invalidated for type ${type}`);
  }
}
