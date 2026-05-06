import { randomUUID } from 'node:crypto';

export interface SpotKeywordProps {
  id: string;
  name: string;
  nameLower: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tag-style keyword for curated spots (separate Firestore collection from global `keywords`).
 */
export class SpotKeyword {
  readonly id: string;
  readonly name: string;
  readonly nameLower: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: SpotKeywordProps) {
    this.id = props.id;
    this.name = props.name;
    this.nameLower = props.nameLower;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static normalizeNameLower(name: string): string {
    return name.trim().toLowerCase();
  }

  static create(
    props: Omit<SpotKeywordProps, 'id' | 'createdAt' | 'updatedAt' | 'nameLower'>,
  ): SpotKeyword {
    const now = new Date().toISOString();
    return new SpotKeyword({
      id: randomUUID(),
      name: props.name.trim(),
      nameLower: SpotKeyword.normalizeNameLower(props.name),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: SpotKeywordProps): SpotKeyword {
    return new SpotKeyword(props);
  }

  update(props: Partial<Omit<SpotKeywordProps, 'id' | 'createdAt'>>): SpotKeyword {
    const name = props.name !== undefined ? props.name.trim() : this.name;
    return new SpotKeyword({
      ...this,
      ...props,
      name,
      nameLower:
        props.name !== undefined ? SpotKeyword.normalizeNameLower(props.name) : this.nameLower,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): SpotKeywordProps {
    return {
      id: this.id,
      name: this.name,
      nameLower: this.nameLower,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
