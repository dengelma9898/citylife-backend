import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationResult } from '../interfaces/location-result.interface';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly hereAppId: string;
  private readonly hereApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.hereAppId = this.configService.get<string>('HERE_APP_ID') || '';
    this.hereApiKey = this.configService.get<string>('HERE_API_KEY') || '';
    
    if (!this.hereApiKey) {
      this.logger.warn('HERE_API_KEY is not set in environment variables');
    }
  }

  /**
   * Sucht nach Adressen basierend auf dem Suchbegriff
   * 
   * @param searchQuery - Der Suchbegriff für die Adresssuche
   * @returns Array von LocationResults mit gefundenen Adressen
   */
  public async searchLocations(searchQuery: string): Promise<LocationResult[]> {
    this.logger.debug(`Searching for locations with query: ${searchQuery}`);
    
    if (!this.hereApiKey) {
      this.logger.error('HERE_API_KEY is missing. Cannot perform location search.');
      return [];
    }
    
    try {
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(searchQuery)}&apiKey=${this.hereApiKey}&lang=de`,
        {
          headers: {
            'Accept-Language': 'de'
          }
        }
      );
      
      if (!response.ok) {
        this.logger.error(`HERE API error: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      this.logger.debug(`Found ${data.items?.length || 0} location results`);
      
      return data.items || [];
    } catch (error) {
      this.logger.error(`Error searching locations: ${error.message}`);
      return [];
    }
  }
} 