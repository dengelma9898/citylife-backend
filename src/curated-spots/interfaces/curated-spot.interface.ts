import { CuratedSpotStatus } from '../domain/enums/curated-spot-status.enum';

export interface CuratedSpotAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

/**
 * Builds an address from Firestore / plain JSON (missing fields become empty / 0 for legacy rows).
 */
export function parseCuratedSpotAddress(raw: unknown): CuratedSpotAddress {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const lat = o.latitude;
  const lng = o.longitude;
  return {
    street: String(o.street ?? ''),
    houseNumber: String(o.houseNumber ?? ''),
    postalCode: String(o.postalCode ?? ''),
    city: String(o.city ?? ''),
    latitude: typeof lat === 'number' ? lat : Number(lat) || 0,
    longitude: typeof lng === 'number' ? lng : Number(lng) || 0,
  };
}

export function normalizeCuratedSpotNameLower(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Curated location spot (admin-managed), searchable by name prefix and spot keyword IDs (AND).
 */
export interface CuratedSpot {
  id: string;
  name: string;
  nameLower: string;
  descriptionMarkdown: string;
  imageUrls: string[];
  keywordIds: string[];
  address: CuratedSpotAddress;
  videoUrl?: string | null;
  instagramUrl?: string | null;
  status: CuratedSpotStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  /** Editorial score 1–5, or null if unset. */
  adminRating?: number | null;
  /** ISO time of last adminRating change; null when adminRating is null. */
  adminRatedAt?: string | null;
  userRatingAverage?: number | null;
  userRatingCount?: number;
}
