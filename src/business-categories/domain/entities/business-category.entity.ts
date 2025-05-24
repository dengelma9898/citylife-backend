export interface BusinessCategoryProps {
  id: string;
  name: string;
  iconName: string;
  description: string;
  keywordIds: string[];
  keywords?: any[];
  createdAt: string;
  updatedAt: string;
}

export class BusinessCategory {
  readonly id: string;
  readonly name: string;
  readonly iconName: string;
  readonly description: string;
  readonly keywordIds: string[];
  readonly keywords?: any[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: BusinessCategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.iconName = props.iconName;
    this.description = props.description;
    this.keywordIds = props.keywordIds;
    this.keywords = props.keywords;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<BusinessCategoryProps, 'id' | 'createdAt' | 'updatedAt'>): BusinessCategory {
    const now = new Date().toISOString();
    return new BusinessCategory({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now
    });
  }

  static fromProps(props: BusinessCategoryProps): BusinessCategory {
    return new BusinessCategory(props);
  }

  update(props: Partial<Omit<BusinessCategoryProps, 'id' | 'createdAt'>>): BusinessCategory {
    return new BusinessCategory({
      ...this,
      ...props,
      updatedAt: new Date().toISOString()
    });
  }

  toJSON(): BusinessCategoryProps {
    return {
      id: this.id,
      name: this.name,
      iconName: this.iconName,
      description: this.description,
      keywordIds: this.keywordIds,
      keywords: this.keywords,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
} 