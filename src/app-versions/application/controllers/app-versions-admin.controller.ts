import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Logger,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AppVersionsService } from '../services/app-versions.service';
import { SetMinimumVersionDto } from '../../dto/set-minimum-version.dto';
import { CreateVersionChangelogDto } from '../../dto/create-version-changelog.dto';
import { UpdateVersionChangelogDto } from '../../dto/update-version-changelog.dto';
import { VersionChangelogResponseDto } from '../../dto/version-changelog-response.dto';
import { Roles } from '../../../core/decorators/roles.decorator';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { AppVersion } from '../../domain/entities/app-version.entity';
import { VersionChangelog } from '../../domain/entities/version-changelog.entity';

@ApiTags('app-versions-admin')
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

  @Post('changelogs')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Erstellt einen neuen Version Changelog (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Changelog wurde erfolgreich erstellt',
    type: VersionChangelogResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Changelog für diese Version existiert bereits',
  })
  public async createChangelog(
    @Body() dto: CreateVersionChangelogDto,
    @CurrentUser() userId: string,
  ): Promise<VersionChangelog> {
    this.logger.log(`POST /app-versions/admin/changelogs - version: ${dto.version}`);
    try {
      return await this.appVersionsService.createChangelog(dto.version, dto.content, userId);
    } catch (error) {
      this.logger.error(`Error creating changelog: ${error.message}`);
      throw error;
    }
  }

  @Get('changelogs')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Gibt alle Version Changelogs zurück (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Liste aller Changelogs',
    type: [VersionChangelogResponseDto],
  })
  public async getAllChangelogs(): Promise<VersionChangelog[]> {
    this.logger.log('GET /app-versions/admin/changelogs');
    return this.appVersionsService.getAllChangelogs();
  }

  @Get('changelogs/:version')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Gibt den Changelog für eine Version zurück (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Changelog für die angegebene Version',
    type: VersionChangelogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Changelog für diese Version nicht gefunden',
  })
  @ApiParam({
    name: 'version',
    description: 'App-Version im Format X.Y.Z',
    example: '1.2.3',
  })
  public async getChangelogByVersion(
    @Param('version') version: string,
  ): Promise<VersionChangelog> {
    this.logger.log(`GET /app-versions/admin/changelogs/${version}`);
    const changelog = await this.appVersionsService.getChangelogForVersion(version);
    if (!changelog) {
      throw new NotFoundException(`Changelog for version ${version} not found`);
    }
    return changelog;
  }

  @Put('changelogs/:version')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Aktualisiert den Changelog für eine Version (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Changelog wurde erfolgreich aktualisiert',
    type: VersionChangelogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Changelog für diese Version nicht gefunden',
  })
  @ApiParam({
    name: 'version',
    description: 'App-Version im Format X.Y.Z',
    example: '1.2.3',
  })
  public async updateChangelog(
    @Param('version') version: string,
    @Body() dto: UpdateVersionChangelogDto,
  ): Promise<VersionChangelog> {
    this.logger.log(`PUT /app-versions/admin/changelogs/${version}`);
    try {
      return await this.appVersionsService.updateChangelog(version, dto.content);
    } catch (error) {
      this.logger.error(`Error updating changelog: ${error.message}`);
      throw error;
    }
  }

  @Delete('changelogs/:version')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Löscht den Changelog für eine Version (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Changelog wurde erfolgreich gelöscht',
  })
  @ApiResponse({
    status: 404,
    description: 'Changelog für diese Version nicht gefunden',
  })
  @ApiParam({
    name: 'version',
    description: 'App-Version im Format X.Y.Z',
    example: '1.2.3',
  })
  public async deleteChangelog(@Param('version') version: string): Promise<void> {
    this.logger.log(`DELETE /app-versions/admin/changelogs/${version}`);
    try {
      await this.appVersionsService.deleteChangelog(version);
    } catch (error) {
      this.logger.error(`Error deleting changelog: ${error.message}`);
      throw error;
    }
  }
}
