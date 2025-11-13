import { Controller, Put, Get, Body, Logger, UseGuards } from '@nestjs/common';
import { DowntimeService } from './downtime.service';
import { SetDowntimeDto } from './dto/set-downtime.dto';
import { RolesGuard } from '../core/guards/roles.guard';
import { Roles } from '../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('downtime')
@Controller('downtime')
@UseGuards(RolesGuard)
export class DowntimeController {
  private readonly logger = new Logger(DowntimeController.name);

  constructor(private readonly downtimeService: DowntimeService) {}

  @Get()
  @Roles('user', 'admin', 'super_admin', 'business_user')
  @ApiOperation({ summary: 'Gibt den aktuellen Downtime-Status zurück' })
  @ApiResponse({
    status: 200,
    description: 'Der aktuelle Downtime-Status',
  })
  public async getDowntime(): Promise<{ isDowntime: boolean }> {
    this.logger.log('GET /downtime');
    const isDowntime = await this.downtimeService.getIsDowntime();
    return { isDowntime };
  }

  @Put()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Setzt den Downtime-Status' })
  @ApiResponse({
    status: 200,
    description: 'Der Downtime-Status wurde erfolgreich gesetzt',
  })
  public async setDowntime(
    @Body() setDowntimeDto: SetDowntimeDto,
  ): Promise<{ isDowntime: boolean }> {
    this.logger.log(`PUT /downtime - Setting downtime to: ${setDowntimeDto.isDowntime}`);
    return this.downtimeService.setIsDowntime(setDowntimeDto.isDowntime);
  }
}
