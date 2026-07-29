export enum LegalDocumentType {
  IMPRESSUM = 'impressum',
  DATENSCHUTZ = 'datenschutz',
  AGB = 'agb',
}

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  content: string;
  version: number;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}
