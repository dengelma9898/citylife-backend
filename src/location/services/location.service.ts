import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly HERE_API_URL = 'https://geocode.search.hereapi.com/v1/geocode';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sucht nach Adressen basierend auf dem Suchbegriff
   * 
   * @param searchQuery - Der Suchbegriff für die Adresssuche
   * @returns Array von LocationResults mit gefundenen Adressen
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

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HERE API responded with status: ${response.status}`);
      }

      const data = await response.json();
      this.logger.debug(`Found ${data.items?.length || 0} location results`);
      return data.items || [];
    } catch (error) {
      this.logger.error(`Error searching locations: ${error.message}`);
      throw error;
    }
  }
} 