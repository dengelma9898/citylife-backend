import { Controller, Get, Query, Logger, ValidationPipe, UsePipes } from '@nestjs/common';
import { LocationService } from './services/location.service';
import { LocationResult } from './interfaces/location-result.interface';
import { LocationSearchDto } from './dto/location-search.dto';

@Controller('location')
export class LocationController {
  private readonly logger = new Logger(LocationController.name);

  constructor(private readonly locationService: LocationService) {}

  /**
   * Sucht nach Adressen basierend auf dem Suchbegriff
   * Endpunkt: GET /location/search?query=...
   *
   * @param locationSearchDto - DTO mit dem Suchbegriff
   * @returns Array von LocationResults mit gefundenen Adressen
   */
  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async searchLocations(
    @Query() locationSearchDto: LocationSearchDto,
  ): Promise<LocationResult[]> {
    this.logger.log(`GET /location/search?query=${locationSearchDto.query}`);
    return this.locationService.searchLocations(locationSearchDto.query);
  }
}
