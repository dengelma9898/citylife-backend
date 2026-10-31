import { CuratedSpotStatus } from '../domain/enums/curated-spot-status.enum';
import { KidsEquipmentTag } from '../domain/enums/kids-equipment-tag.enum';
import { KidsLocationType } from '../domain/enums/kids-location-type.enum';

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
 * Kids profile of a curated spot. A spot is a kids spot exactly when this profile is set.
 */
export interface KidsProfile {
  locationType: KidsLocationType;
  /** Suitable for toddlers (0-5 years). */
  suitableForToddlers: boolean;
  /** Suitable for school children (6+ years). */
  suitableForSchoolKids: boolean;
  /** Admission is free for all parties (consumption is not considered). */
  isFree: boolean;
  /** Editorial seal, independent of the location type. */
  isBadWeatherTip: boolean;
  equipmentTags: KidsEquipmentTag[];
}

/**
 * Builds a kids profile from Firestore / plain JSON.
 * Missing or malformed legacy data yields null; unknown equipment tags are dropped.
 */
export function parseKidsProfile(raw: unknown): KidsProfile | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const locationType = Object.values(KidsLocationType).find(value => value === o.locationType);
  if (locationType === undefined) {
    return null;
  }
  const knownTags = Object.values(KidsEquipmentTag);
  const rawTags = Array.isArray(o.equipmentTags) ? o.equipmentTags : [];
  return {
    locationType,
    suitableForToddlers: o.suitableForToddlers === true,
    suitableForSchoolKids: o.suitableForSchoolKids === true,
    isFree: o.isFree === true,
    isBadWeatherTip: o.isBadWeatherTip === true,
    equipmentTags: [...new Set(knownTags.filter(tag => rawTags.includes(tag)))],
  };
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
  websiteUrl?: string | null;
  /** Kids profile; the spot is a kids spot exactly when this is set. */
  kidsProfile?: KidsProfile | null;
  /** Derived in API responses (kidsProfile !== null); never stored. */
  isKidsSpot?: boolean;
  /** ISO time of the one-time "new kids spot" push; internal, never accepted from clients. */
  kidsNotificationSentAt?: string | null;
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
