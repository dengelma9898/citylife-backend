import { KidsAgeGroup } from '../domain/enums/kids-age-group.enum';
import { KidsLocationType } from '../domain/enums/kids-location-type.enum';

/**
 * Filters for the kids view; all set filters are combined with AND.
 * `isFree` / `isBadWeatherTip` are "only show these" switches (true) - unset means no filter.
 */
export interface KidsSearchFilters {
  /** INDOOR matches INDOOR + BOTH, OUTDOOR matches OUTDOOR + BOTH, BOTH matches BOTH only. */
  locationType?: KidsLocationType;
  ageGroup?: KidsAgeGroup;
  isFree?: boolean;
  isBadWeatherTip?: boolean;
}
