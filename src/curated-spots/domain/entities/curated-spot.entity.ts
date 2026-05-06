import { randomUUID } from 'node:crypto';
import { CuratedSpotStatus } from '../enums/curated-spot-status.enum';

export interface CuratedSpotAddressProps {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export class CuratedSpotAddress {
  readonly street: string;
  readonly houseNumber: string;
  readonly postalCode: string;
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;

  private constructor(props: CuratedSpotAddressProps) {
    this.street = props.street;
    this.houseNumber = props.houseNumber;
    this.postalCode = props.postalCode;
    this.city = props.city;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }

  static create(props: CuratedSpotAddressProps): CuratedSpotAddress {
    return new CuratedSpotAddress(props);
  }

  /**
   * Builds an address from Firestore / plain JSON (missing fields become empty / 0 for legacy rows).
   */
  static fromUnknown(raw: unknown): CuratedSpotAddress {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const lat = o.latitude;
    const lng = o.longitude;
    return CuratedSpotAddress.create({
      street: String(o.street ?? ''),
      houseNumber: String(o.houseNumber ?? ''),
      postalCode: String(o.postalCode ?? ''),
      city: String(o.city ?? ''),
      latitude: typeof lat === 'number' ? lat : Number(lat) || 0,
      longitude: typeof lng === 'number' ? lng : Number(lng) || 0,
    });
  }

  toJSON(): CuratedSpotAddressProps {
    return {
      street: this.street,
      houseNumber: this.houseNumber,
      postalCode: this.postalCode,
      city: this.city,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }
}

export interface CuratedSpotProps {
  id: string;
  name: string;
  nameLower: string;
  descriptionMarkdown: string;
  imageUrls: string[];
  keywordIds: string[];
  address: CuratedSpotAddressProps;
  videoUrl?: string | null;
  instagramUrl?: string | null;
  status: CuratedSpotStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
}

/**
 * Curated location spot (admin-managed), searchable by name prefix and spot keyword IDs (AND).
 */
export class CuratedSpot {
  readonly id: string;
  readonly name: string;
  readonly nameLower: string;
  readonly descriptionMarkdown: string;
  readonly imageUrls: string[];
  readonly keywordIds: string[];
  readonly address: CuratedSpotAddress;
  readonly videoUrl?: string | null;
  readonly instagramUrl?: string | null;
  readonly status: CuratedSpotStatus;
  readonly isDeleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByUserId?: string | null;

  private constructor(
    props: Omit<CuratedSpotProps, 'address'> & { readonly address: CuratedSpotAddress },
  ) {
    this.id = props.id;
    this.name = props.name;
    this.nameLower = props.nameLower;
    this.descriptionMarkdown = props.descriptionMarkdown;
    this.imageUrls = props.imageUrls;
    this.keywordIds = props.keywordIds;
    this.address = props.address;
    this.videoUrl = props.videoUrl;
    this.instagramUrl = props.instagramUrl;
    this.status = props.status;
    this.isDeleted = props.isDeleted;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.createdByUserId = props.createdByUserId;
  }

  static normalizeNameLower(name: string): string {
    return name.trim().toLowerCase();
  }

  static create(
    props: Omit<
      CuratedSpotProps,
      'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'nameLower' | 'imageUrls' | 'keywordIds'
    > & {
      imageUrls?: string[];
      keywordIds?: string[];
    },
  ): CuratedSpot {
    const now = new Date().toISOString();
    return new CuratedSpot({
      id: randomUUID(),
      name: props.name.trim(),
      nameLower: CuratedSpot.normalizeNameLower(props.name),
      descriptionMarkdown: props.descriptionMarkdown,
      imageUrls: props.imageUrls ?? [],
      keywordIds: props.keywordIds ?? [],
      address: CuratedSpotAddress.create(props.address),
      videoUrl: props.videoUrl ?? null,
      instagramUrl: props.instagramUrl ?? null,
      status: props.status,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: props.createdByUserId ?? null,
    });
  }

  static fromProps(props: CuratedSpotProps): CuratedSpot {
    return new CuratedSpot({
      ...props,
      address: CuratedSpotAddress.fromUnknown(props.address),
    });
  }

  update(props: Partial<Omit<CuratedSpotProps, 'id' | 'createdAt'>>): CuratedSpot {
    const name = props.name !== undefined ? props.name.trim() : this.name;
    const address =
      props.address !== undefined
        ? CuratedSpotAddress.create(props.address)
        : this.address;
    return new CuratedSpot({
      id: this.id,
      name,
      nameLower:
        props.name !== undefined ? CuratedSpot.normalizeNameLower(props.name) : this.nameLower,
      descriptionMarkdown:
        props.descriptionMarkdown !== undefined
          ? props.descriptionMarkdown
          : this.descriptionMarkdown,
      imageUrls: props.imageUrls !== undefined ? props.imageUrls : this.imageUrls,
      keywordIds: props.keywordIds !== undefined ? props.keywordIds : this.keywordIds,
      address,
      videoUrl: props.videoUrl !== undefined ? props.videoUrl : this.videoUrl,
      instagramUrl: props.instagramUrl !== undefined ? props.instagramUrl : this.instagramUrl,
      status: props.status !== undefined ? props.status : this.status,
      isDeleted: props.isDeleted !== undefined ? props.isDeleted : this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: new Date().toISOString(),
      createdByUserId:
        props.createdByUserId !== undefined ? props.createdByUserId : this.createdByUserId,
    });
  }

  toJSON(): CuratedSpotProps {
    return {
      id: this.id,
      name: this.name,
      nameLower: this.nameLower,
      descriptionMarkdown: this.descriptionMarkdown,
      imageUrls: this.imageUrls,
      keywordIds: this.keywordIds,
      address: this.address.toJSON(),
      videoUrl: this.videoUrl,
      instagramUrl: this.instagramUrl,
      status: this.status,
      isDeleted: this.isDeleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdByUserId: this.createdByUserId,
    };
  }
}

