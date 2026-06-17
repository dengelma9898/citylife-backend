import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';
import { HereApiResponse } from '../interfaces/here-api-response.interface';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly HERE_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';
  private readonly HERE_REVGEOCODE_URL = 'https://revgeocode.search.hereapi.com/v1/revgeocode';
  private readonly SEARCH_CACHE_PREFIX = 'location:search:';
  private readonly REVERSE_CACHE_PREFIX = 'location:reverse:';
  private readonly SEARCH_CACHE_TTL = 3600000;
  private readonly REVERSE_CACHE_TTL = 86400000;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /** ISO 3166-1 Alpha-2 Country Code für Deutschland */
  private readonly COUNTRY_CODE_DE = 'DE';

  /**
   * Sucht nach Adressen basierend auf dem Suchbegriff
   * Ergebnisse sind auf Deutschland beschränkt (in=countryCode:DEU).
   */
  public async searchLocations(searchQuery: string): Promise<LocationResult[]> {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const cacheKey = `${this.SEARCH_CACHE_PREFIX}${normalizedQuery}`;
    const cached = await this.cacheManager.get<LocationResult[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for location search: ${normalizedQuery}`);
      return cached;
    }
    this.logger.log(`Searching locations for query: ${searchQuery}`);
    const appId = this.configService.get<string>('HERE_APP_ID');
    const apiKey = this.configService.get<string>('HERE_API_KEY');
    if (!appId || !apiKey) {
      throw new Error('HERE API credentials are not configured');
    }
    const url = new URL(this.HERE_API_URL);
    url.searchParams.append('q', searchQuery);
    url.searchParams.append('apiKey', apiKey);
    url.searchParams.append('in', 'countryCode:DEU');
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HERE API responded with status: ${response.status}`);
      }
      const data = (await response.json()) as HereApiResponse;
      const items = data.items || [];
      const filteredItems = items.filter(
        item =>
          item.address?.countryCode?.toUpperCase() === this.COUNTRY_CODE_DE ||
          item.address?.countryCode === 'DEU',
      );
      this.logger.debug(
        `Found ${items.length} location results, ${filteredItems.length} in Germany`,
      );
      await this.cacheManager.set(cacheKey, filteredItems, this.SEARCH_CACHE_TTL);
      return filteredItems;
    } catch (error) {
      this.logger.error(`Error searching locations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wählt den „besten“ deutschen HERE-Treffer für Reverse-Geocoding.
   */
  private pickBestGermanReverseItem(items: LocationResult[]): LocationResult | null {
    const germanItems = items.filter(
      item =>
        item.address?.countryCode?.toUpperCase() === this.COUNTRY_CODE_DE ||
        item.address?.countryCode === 'DEU',
    );
    if (germanItems.length === 0) {
      return null;
    }
    const scoreItem = (item: LocationResult): number => {
      const a = item.address;
      if (!a) {
        return 0;
      }
      let s = 0;
      const street = (a.street || '').trim();
      const houseNum = ((a as { houseNumber?: string }).houseNumber || '').trim();
      const plz = (a.postalCode || '').trim();
      const city = (a.city || '').trim();
      if (street.length > 0) {
        s += 4;
      }
      if (houseNum.length > 0) {
        s += 1;
      }
      if (plz.length > 0) {
        s += 2;
      }
      if (city.length > 0) {
        s += 1;
      }
      const type = item.resultType || '';
      if (type === 'houseNumber') {
        s += 2;
      }
      if (type === 'addressBlock' || type === 'intersection') {
        s += 1;
      }
      const hasLabelContent = (a.label || '').trim().length > 0;
      if (hasLabelContent && street.length === 0) {
        s += 1;
      }
      return s;
    };
    let bestIndex = 0;
    let bestScore = scoreItem(germanItems[0]);
    for (let i = 1; i < germanItems.length; i++) {
      const sc = scoreItem(germanItems[i]);
      if (sc > bestScore) {
        bestScore = sc;
        bestIndex = i;
      }
    }
    return germanItems[bestIndex];
  }

  /**
   * Reverse-Geocode (HERE). Deutschland-Filter erfolgt anhand der Antwort-Items.
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<LocationResult | null> {
    const roundedLat = latitude.toFixed(5);
    const roundedLng = longitude.toFixed(5);
    const cacheKey = `${this.REVERSE_CACHE_PREFIX}${roundedLat}:${roundedLng}`;
    const cached = await this.cacheManager.get<LocationResult | 'NULL'>(cacheKey);
    if (cached !== undefined) {
      this.logger.debug(`Cache hit for reverse geocode: ${roundedLat},${roundedLng}`);
      return cached === 'NULL' ? null : cached;
    }
    this.logger.log(`Reverse geocoding lat=${latitude}, lng=${longitude}`);
    const appId = this.configService.get<string>('HERE_APP_ID');
    const apiKey = this.configService.get<string>('HERE_API_KEY');
    if (!appId || !apiKey) {
      throw new Error('HERE API credentials are not configured');
    }
    const url = new URL(this.HERE_REVGEOCODE_URL);
    url.searchParams.append('at', `${latitude},${longitude}`);
    url.searchParams.append('apiKey', apiKey);
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HERE API responded with status: ${response.status}`);
      }
      const data = (await response.json()) as HereApiResponse;
      const items = data.items || [];
      const best = this.pickBestGermanReverseItem(items);
      this.logger.debug(
        `Revgeocode found ${items.length} raw results, ${best ? 1 : 0} ` +
          'usable German hits (best-score pick)',
      );
      await this.cacheManager.set(cacheKey, best ?? 'NULL', this.REVERSE_CACHE_TTL);
      return best;
    } catch (error) {
      this.logger.error(`Error reverse geocoding: ${error.message}`);
      throw error;
    }
  }
}
