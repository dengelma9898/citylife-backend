import { Controller, Get, Logger, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BootstrapService } from './bootstrap.service';
import { BootstrapResponse } from './interfaces/bootstrap-payload.interface';

@ApiTags('bootstrap')
@ApiBearerAuth()
@Controller('bootstrap')
export class BootstrapController {
  private readonly logger = new Logger(BootstrapController.name);

  constructor(private readonly bootstrapService: BootstrapService) {}

  @Get()
  @ApiOperation({
    summary: 'Aggregated cold-start bundle for the Flutter app',
  })
  @ApiQuery({
    name: 'version',
    required: false,
    description: 'Current app version for update check (e.g. 1.2.3)',
  })
  @ApiResponse({ status: 200, description: 'Bootstrap payload' })
  public async getBootstrap(
    @Request() req: { user: { uid: string } },
    @Query('version') version?: string,
  ): Promise<BootstrapResponse> {
    this.logger.log(`GET /bootstrap${version ? `?version=${version}` : ''}`);
    return this.bootstrapService.getBootstrap(req.user.uid, version);
  }
}
