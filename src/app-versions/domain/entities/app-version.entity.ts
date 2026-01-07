export interface AppVersionProps {
  id: string;
  minimumVersion: string;
  createdAt: string;
  updatedAt: string;
}

export class AppVersion {
  readonly id: string;
  readonly minimumVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: AppVersionProps) {
    this.id = props.id;
    this.minimumVersion = props.minimumVersion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<AppVersionProps, 'id' | 'createdAt' | 'updatedAt'>): AppVersion {
    const now = new Date().toISOString();
    return new AppVersion({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: AppVersionProps): AppVersion {
    return new AppVersion(props);
  }

  update(props: Partial<Omit<AppVersionProps, 'id' | 'createdAt'>>): AppVersion {
    return new AppVersion({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): AppVersionProps {
    return {
      id: this.id,
      minimumVersion: this.minimumVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
