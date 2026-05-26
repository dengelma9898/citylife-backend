import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';
import { HereApiResponse } from '../interfaces/here-api-response.interface';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly HERE_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';
  private readonly HERE_REVGEOCODE_URL = 'https://revgeocode.search.hereapi.com/v1/revgeocode';

  constructor(private readonly configService: ConfigService) {}

  /** ISO 3166-1 Alpha-2 Country Code für Deutschland */
  private readonly COUNTRY_CODE_DE = 'DE';

  /**
   * Sucht nach Adressen basierend auf dem Suchbegriff
   * Ergebnisse sind auf Deutschland beschränkt (in=countryCode:DEU).
   *
   * @param searchQuery - Der Suchbegriff für die Adresssuche
   * @returns Array von LocationResults mit gefundenen Adressen in Deutschland
   */
  public async searchLocations(searchQuery: string): Promise<LocationResult[]> {
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
      return filteredItems;
    } catch (error) {
      this.logger.error(`Error searching locations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wählt den „besten“ deutschen HERE-Treffer für Reverse-Geocoding.
   * Der erste Listen-Eintrag ist oft nur ein zusammengefasster Ort (leere Straße).
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
   * Reverse-Geocode (HERE). Deutschland-Filter erfolgt anhand der Antwort-Items; `in=countryCode`
   * darf nicht zusammen mit `at` gesendet werden (HERE liefert dann 400).
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<LocationResult | null> {
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
      return best;
    } catch (error) {
      this.logger.error(`Error reverse geocoding: ${error.message}`);
      throw error;
    }
  }
}
