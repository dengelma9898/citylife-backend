/**
 * Toggleable product features. The backend only stores the flags;
 * clients (app, admin FE) decide what to show or hide based on them.
 */
export enum FeatureFlag {
  COMMUNITY = 'community',
  KIDS_SPOTS = 'kids-spots',
  CHRISTMAS_MARKETS = 'christmas-markets',
}
