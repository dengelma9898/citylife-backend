import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UnauthorizedException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { PassStatsService } from '../services/pass-stats.service';
import { PassStatsQueryDto } from '../../dto/pass-stats-query.dto';
import { PassStatsResponse } from '../../domain/interfaces/pass-stats-response.interface';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class PassStatsController {
  private readonly logger = new Logger(PassStatsController.name);

  constructor(private readonly passStatsService: PassStatsService) {}

  @Get(':id/pass-stats')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get City Pass usage statistics for the authenticated user' })
  @ApiParam({ name: 'id', description: 'Firebase user id' })
  @ApiQuery({ name: 'period', enum: ['month', 'year'], required: false })
  @ApiResponse({ status: 200, description: 'Pass statistics for the requested period' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  public async getPassStats(
    @Request() req: { user: { uid: string } },
    @Param('id') userId: string,
    @Query() query: PassStatsQueryDto,
  ): Promise<PassStatsResponse> {
    this.logger.log(`GET /users/${userId}/pass-stats?period=${query.period}`);
    if (req.user.uid !== userId) {
      throw new UnauthorizedException('User ID does not match authenticated user');
    }
    return this.passStatsService.getStats(userId, query.period ?? 'month');
  }
}
