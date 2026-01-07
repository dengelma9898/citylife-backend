import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AppVersionsService } from '../services/app-versions.service';
import { SetMinimumVersionDto } from '../../dto/set-minimum-version.dto';
import { Roles } from '../../../core/decorators/roles.decorator';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { AppVersion } from '../../domain/entities/app-version.entity';

@Controller('app-versions/admin')
@UseGuards(RolesGuard)
export class AppVersionsAdminController {
  private readonly logger = new Logger(AppVersionsAdminController.name);

  constructor(private readonly appVersionsService: AppVersionsService) {}

  @Get('minimum-version')
  @Roles('super_admin')
  public async getMinimumVersion(): Promise<AppVersion | null> {
    this.logger.log('GET /app-versions/admin/minimum-version');
    return this.appVersionsService.getMinimumVersion();
  }

  @Post('minimum-version')
  @Roles('super_admin')
  public async setMinimumVersion(@Body() dto: SetMinimumVersionDto): Promise<AppVersion> {
    this.logger.log(`POST /app-versions/admin/minimum-version - version: ${dto.minimumVersion}`);

    if (!dto.minimumVersion) {
      throw new BadRequestException('minimumVersion is required');
    }

    try {
      return await this.appVersionsService.setMinimumVersion(dto.minimumVersion);
    } catch (error) {
      this.logger.error(`Error setting minimum version: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}

