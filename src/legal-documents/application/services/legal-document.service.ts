import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  LegalDocumentRepository,
  LEGAL_DOCUMENT_REPOSITORY,
} from '../../domain/repositories/legal-document.repository';
import { LegalDocument, LegalDocumentType } from '../../domain/entities/legal-document.entity';

@Injectable()
export class LegalDocumentService {
  private readonly logger = new Logger(LegalDocumentService.name);
  private readonly CACHE_KEY_PREFIX = 'legal-documents:latest:';
  private readonly CACHE_TTL = 900000;

  constructor(
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly legalDocumentRepository: LegalDocumentRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(
    type: LegalDocumentType,
    content: string,
    createdBy: string,
  ): Promise<LegalDocument> {
    this.logger.log(`Creating new legal document of type ${type}`);
    const latestDocument = await this.legalDocumentRepository.findLatestByType(type);
    const nextVersion = latestDocument ? latestDocument.version + 1 : 1;
    const newDocument = LegalDocument.createWithVersion({
      type,
      content,
      createdBy,
      version: nextVersion,
    });
    const saved = await this.legalDocumentRepository.save(newDocument);
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
    const document = await this.legalDocumentRepository.findLatestByType(type);
    if (!document) {
      throw new NotFoundException(`No legal document found for type ${type}`);
    }
    await this.cacheManager.set(cacheKey, document, this.CACHE_TTL);
    return document;
  }

  async getAllByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    this.logger.log(`Getting all legal documents of type ${type}`);
    return this.legalDocumentRepository.findByType(type);
  }

  async getById(id: string): Promise<LegalDocument> {
    this.logger.log(`Getting legal document with id ${id}`);
    const document = await this.legalDocumentRepository.findById(id);
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
