import { LegalDocument } from '../entities/legal-document.entity';
import { LegalDocumentType } from '../entities/legal-document.entity';

export const LEGAL_DOCUMENT_REPOSITORY = 'LEGAL_DOCUMENT_REPOSITORY';

export interface LegalDocumentRepository {
  save(document: LegalDocument): Promise<LegalDocument>;
  findById(id: string): Promise<LegalDocument | null>;
  findByType(type: LegalDocumentType): Promise<LegalDocument[]>;
  findLatestByType(type: LegalDocumentType): Promise<LegalDocument | null>;
  update(document: LegalDocument): Promise<LegalDocument>;
}
