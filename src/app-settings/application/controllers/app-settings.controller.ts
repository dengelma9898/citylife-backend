import { Controller, Get, Param, Logger } from '@nestjs/common';
import { AppSettingsService } from '../services/app-settings.service';
import { AppSettings } from '../../domain/entities/app-settings.entity';

@Controller('app-settings')
export class AppSettingsController {
  private readonly logger = new Logger(AppSettingsController.name);

  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  public async getAll(): Promise<AppSettings[]> {
    this.logger.log('GET /app-settings');
    return this.appSettingsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<AppSettings | null> {
    this.logger.log(`GET /app-settings/${id}`);
    return this.appSettingsService.getById(id);
  }
}
