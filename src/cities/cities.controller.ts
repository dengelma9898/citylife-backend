import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CitiesService } from './cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  public async getAllCities(): Promise<any[]> {
    return this.citiesService.getAllCities();
  }

  @Get(':id')
  public async getCityById(@Param('id') id: string): Promise<any> {
    const city = await this.citiesService.getCityById(id);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }
} 