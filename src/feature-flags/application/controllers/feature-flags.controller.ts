import { Body, Controller, Get, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlag } from '../../domain/enums/feature-flag.enum';
import {
  FeatureFlagSettings,
  FeatureFlagsResponse,
} from '../../interfaces/feature-flag-settings.interface';
import { UpdateFeatureFlagDto } from '../../dto/update-feature-flag.dto';
import { ParseFeatureFlagPipe } from '../../dto/parse-feature-flag.pipe';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';

@ApiTags('feature-flags')
@ApiBearerAuth()
@Controller('feature-flags')
@UseGuards(RolesGuard)
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all feature flags (clients decide what to show or hide based on them)',
  })
  public async getAll(): Promise<FeatureFlagsResponse> {
    this.logger.log('GET /feature-flags');
    return this.featureFlagsService.getAllFlags();
  }

  @Get(':flag')
  @ApiParam({ name: 'flag', enum: FeatureFlag })
  @ApiOperation({ summary: 'Get a single feature flag' })
  public async getOne(
    @Param('flag', ParseFeatureFlagPipe) flag: FeatureFlag,
  ): Promise<FeatureFlagSettings> {
    this.logger.log(`GET /feature-flags/${flag}`);
    return this.featureFlagsService.getFlag(flag);
  }

  @Patch(':flag')
  @Roles('admin', 'super_admin')
  @ApiParam({ name: 'flag', enum: FeatureFlag })
  @ApiOperation({ summary: 'Update a feature flag (admin)' })
  public async update(
    @Param('flag', ParseFeatureFlagPipe) flag: FeatureFlag,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() userId: string,
  ): Promise<FeatureFlagSettings> {
    this.logger.log(`PATCH /feature-flags/${flag}`);
    return this.featureFlagsService.updateFlag(flag, dto.isEnabled, userId);
  }
}
