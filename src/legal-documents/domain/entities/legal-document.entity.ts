export enum LegalDocumentType {
  IMPRESSUM = 'impressum',
  DATENSCHUTZ = 'datenschutz',
  AGB = 'agb',
}

export interface LegalDocumentProps {
  id: string;
  type: LegalDocumentType;
  content: string;
  version: number;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export class LegalDocument {
  readonly id: string;
  readonly type: LegalDocumentType;
  readonly content: string;
  readonly version: number;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly isActive: boolean;

  private constructor(props: LegalDocumentProps) {
    this.id = props.id;
    this.type = props.type;
    this.content = props.content;
    this.version = props.version;
    this.createdAt = props.createdAt;
    this.createdBy = props.createdBy;
    this.isActive = props.isActive;
  }

  static create(props: Omit<LegalDocumentProps, 'id' | 'version' | 'createdAt' | 'isActive'>): LegalDocument {
    return new LegalDocument({
      id: crypto.randomUUID(),
      version: 1,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...props,
    });
  }

  static fromProps(props: LegalDocumentProps): LegalDocument {
    return new LegalDocument(props);
  }

  createNewVersion(content: string, createdBy: string): LegalDocument {
    return new LegalDocument({
      id: crypto.randomUUID(),
      type: this.type,
      content,
      version: this.version + 1,
      createdAt: new Date().toISOString(),
      createdBy,
      isActive: true,
    });
  }

  deactivate(): LegalDocument {
    return new LegalDocument({
      ...this,
      isActive: false,
    });
  }

  toJSON(): LegalDocumentProps {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      version: this.version,
      createdAt: this.createdAt,
      createdBy: this.createdBy,
      isActive: this.isActive,
    };
  }
}

