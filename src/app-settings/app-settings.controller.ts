import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { Preference } from './interfaces/preference.interface';

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  public async getAll(): Promise<Preference[]> {
    return this.appSettingsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Preference> {
    const preference = await this.appSettingsService.getById(id);
    if (!preference) {
      throw new NotFoundException('Preference not found');
    }
    return preference;
  }
} 