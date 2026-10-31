/**
 * Controlled list of kids equipment tags (display only, not filterable).
 * Extend this enum in code to add new tags; there is deliberately no tag CRUD.
 */
export enum KidsEquipmentTag {
  DIAPER_CHANGING_FACILITY = 'DIAPER_CHANGING_FACILITY',
  STROLLER_FRIENDLY = 'STROLLER_FRIENDLY',
  NURSING_FRIENDLY = 'NURSING_FRIENDLY',
  PLAY_AREA = 'PLAY_AREA',
  CHILD_SEATS = 'CHILD_SEATS',
  STEP_FREE_ACCESS = 'STEP_FREE_ACCESS',
}
