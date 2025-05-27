export interface JobCategoryProps {
  id: string;
  name: string;
  description?: string;
  colorCode: string;
  iconName: string;
  fallbackImages: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class JobCategory {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly colorCode: string;
  readonly iconName: string;
  readonly fallbackImages: string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: JobCategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.colorCode = props.colorCode;
    this.iconName = props.iconName;
    this.fallbackImages = props.fallbackImages;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(
    props: Omit<JobCategoryProps, 'id' | 'createdAt' | 'updatedAt'>,
    id?: string,
  ): JobCategory {
    const now = new Date();
    return new JobCategory({
      id: id || '',
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  public static fromProps(props: JobCategoryProps): JobCategory {
    return new JobCategory(props);
  }

  public update(
    props: Partial<Omit<JobCategoryProps, 'id' | 'createdAt' | 'updatedAt'>>,
  ): JobCategory {
    return new JobCategory({
      ...this,
      ...props,
      updatedAt: new Date(),
    });
  }

  public toJSON(): JobCategoryProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      colorCode: this.colorCode,
      iconName: this.iconName,
      fallbackImages: this.fallbackImages,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
