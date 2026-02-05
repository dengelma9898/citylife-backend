export interface VersionChangelogProps {
  id: string;
  version: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export class VersionChangelog {
  readonly id: string;
  readonly version: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string;

  private constructor(props: VersionChangelogProps) {
    this.id = props.id;
    this.version = props.version;
    this.content = props.content;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.createdBy = props.createdBy;
  }

  static create(props: Omit<VersionChangelogProps, 'id' | 'createdAt' | 'updatedAt'>): VersionChangelog {
    const now = new Date().toISOString();
    return new VersionChangelog({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: VersionChangelogProps): VersionChangelog {
    return new VersionChangelog(props);
  }

  update(props: Partial<Omit<VersionChangelogProps, 'id' | 'version' | 'createdAt' | 'createdBy'>>): VersionChangelog {
    return new VersionChangelog({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): VersionChangelogProps {
    return {
      id: this.id,
      version: this.version,
      content: this.content,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
    };
  }
}
