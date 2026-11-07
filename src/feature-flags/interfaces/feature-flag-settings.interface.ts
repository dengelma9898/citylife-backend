/**
 * One feature flag as stored in Firestore (`settings` collection) and returned by the API.
 */
export interface FeatureFlagSettings {
  id: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

/** All feature flags in one response, keyed for direct client access. */
export interface FeatureFlagsResponse {
  community: FeatureFlagSettings;
  kidsSpots: FeatureFlagSettings;
  christmasMarkets: FeatureFlagSettings;
}
