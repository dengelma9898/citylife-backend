import { UpdateOpeningHoursDto } from '../../dto/update-opening-hours.dto';

const GERMAN_DAY_NAMES = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const;

export type OpeningHoursInterval = { from: string; to: string };
export type DetailedOpeningHours = Record<string, OpeningHoursInterval[]>;

/**
 * Maps legacy and structured opening-hours payloads for business updates.
 */
export class OpeningHoursMapper {
  /**
   * Transforms legacy day-key format into detailedOpeningHours.
   * Legacy: { "Montag": { "09:00": "18:00" } }
   * Target: { "Montag": [{ from: "09:00", to: "18:00" }] }
   */
  public static transformLegacyFormat(
    rawData: Record<string, unknown>,
  ): DetailedOpeningHours | undefined {
    const hasDayKeys = GERMAN_DAY_NAMES.some(day => rawData[day] !== undefined);
    if (!hasDayKeys) {
      return undefined;
    }
    const transformed: DetailedOpeningHours = {};
    for (const [day, timeSlots] of Object.entries(rawData)) {
      if (!GERMAN_DAY_NAMES.includes(day as (typeof GERMAN_DAY_NAMES)[number])) {
        continue;
      }
      if (typeof timeSlots !== 'object' || timeSlots === null) {
        continue;
      }
      const intervals: OpeningHoursInterval[] = [];
      for (const [from, to] of Object.entries(timeSlots as Record<string, string>)) {
        intervals.push({ from, to });
      }
      transformed[day] = intervals;
    }
    return transformed;
  }

  /**
   * Resolves detailedOpeningHours from DTO, applying legacy transformation when needed.
   */
  public static resolveDetailedOpeningHours(
    openingHoursData: UpdateOpeningHoursDto,
  ): DetailedOpeningHours | undefined {
    if (openingHoursData.detailedOpeningHours !== undefined) {
      return openingHoursData.detailedOpeningHours;
    }
    return OpeningHoursMapper.transformLegacyFormat(
      openingHoursData as unknown as Record<string, unknown>,
    );
  }

  /**
   * Merges incoming detailed opening hours into existing business data.
   */
  public static mergeDetailedOpeningHours(
    existing: DetailedOpeningHours | undefined,
    incoming: DetailedOpeningHours | undefined,
  ): DetailedOpeningHours | undefined {
    if (incoming === undefined) {
      return undefined;
    }
    const merged: DetailedOpeningHours = { ...(existing || {}) };
    for (const [day, intervals] of Object.entries(incoming)) {
      if (merged[day]) {
        merged[day] = [...merged[day], ...intervals];
      } else {
        merged[day] = intervals;
      }
    }
    return merged;
  }

  /**
   * Builds the partial business update payload from opening-hours DTO.
   */
  public static buildUpdatePayload(
    openingHoursData: UpdateOpeningHoursDto,
    existingDetailedOpeningHours?: DetailedOpeningHours,
  ): {
    openingHours?: Record<string, string>;
    detailedOpeningHours?: DetailedOpeningHours;
  } {
    const resolvedDetailed = OpeningHoursMapper.resolveDetailedOpeningHours(openingHoursData);
    const mergedDetailed = OpeningHoursMapper.mergeDetailedOpeningHours(
      existingDetailedOpeningHours,
      resolvedDetailed,
    );
    return {
      ...(openingHoursData.openingHours !== undefined && {
        openingHours: openingHoursData.openingHours,
      }),
      ...(mergedDetailed !== undefined && {
        detailedOpeningHours: mergedDetailed,
      }),
    };
  }
}
