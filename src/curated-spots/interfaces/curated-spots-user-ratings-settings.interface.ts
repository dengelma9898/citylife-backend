/**
 * Feature toggle for end-user ratings on curated spots (default off until enabled by admin).
 */
export interface CuratedSpotsUserRatingsSettings {
  id: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}
