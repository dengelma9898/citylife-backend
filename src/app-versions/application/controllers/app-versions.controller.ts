import { Controller, Get, Query, Logger, BadRequestException } from '@nestjs/common';
import { AppVersionsService } from '../services/app-versions.service';
import { CheckVersionResponseDto } from '../../dto/check-version.dto';

@Controller('app-versions')
export class AppVersionsController {
  private readonly logger = new Logger(AppVersionsController.name);

  constructor(private readonly appVersionsService: AppVersionsService) {}

  @Get('check')
  public async checkVersion(@Query('version') version: string): Promise<CheckVersionResponseDto> {
    this.logger.log(`GET /app-versions/check?version=${version}`);

    if (!version) {
      throw new BadRequestException('Version parameter is required');
    }

    try {
      const requiresUpdate = await this.appVersionsService.checkVersion(version);
      const changelog = await this.appVersionsService.getChangelogForVersion(version);
      const response: CheckVersionResponseDto = { requiresUpdate };
      if (changelog) {
        response.changelogContent = changelog.content;
      }
      return response;
    } catch (error) {
      this.logger.error(`Error checking version: ${error.message}`);
      throw new BadRequestException(`Invalid version format: ${version}`);
    }
  }
}
