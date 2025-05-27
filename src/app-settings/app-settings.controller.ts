import { Controller, Get, Param, Logger } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

@Controller('app-settings')
export class AppSettingsController {
  private readonly logger = new Logger(AppSettingsController.name);

  constructor(private readonly appSettingsService: AppSettingsService) {}

  @Get()
  public async getAll(): Promise<any[]> {
    this.logger.log('GET /app-settings');
    return this.appSettingsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<any> {
    this.logger.log(`GET /app-settings/${id}`);
    return this.appSettingsService.getById(id);
  }
}
