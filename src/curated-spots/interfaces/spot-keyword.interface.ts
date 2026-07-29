export function normalizeSpotKeywordNameLower(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Tag-style keyword for curated spots (separate Firestore collection from global `keywords`).
 */
export interface SpotKeyword {
  id: string;
  name: string;
  nameLower: string;
  createdAt: string;
  updatedAt: string;
}
