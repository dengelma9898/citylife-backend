import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  LegalDocumentRepository,
  LEGAL_DOCUMENT_REPOSITORY,
} from '../../domain/repositories/legal-document.repository';
import { LegalDocument, LegalDocumentType } from '../../domain/entities/legal-document.entity';

@Injectable()
export class LegalDocumentService {
  private readonly logger = new Logger(LegalDocumentService.name);

  constructor(
    @Inject(LEGAL_DOCUMENT_REPOSITORY)
    private readonly legalDocumentRepository: LegalDocumentRepository,
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
    return this.legalDocumentRepository.save(newDocument);
  }

  async getLatestByType(type: LegalDocumentType): Promise<LegalDocument> {
    this.logger.log(`Getting latest legal document of type ${type}`);
    const document = await this.legalDocumentRepository.findLatestByType(type);
    if (!document) {
      throw new NotFoundException(`No legal document found for type ${type}`);
    }
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
}
