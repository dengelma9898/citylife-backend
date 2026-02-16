import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';
import { HereApiResponse } from '../interfaces/here-api-response.interface';
import fetch from 'node-fetch';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly HERE_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';

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
        (item) =>
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
}
