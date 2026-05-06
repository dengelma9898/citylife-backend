import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SpotKeywordsService } from '../services/spot-keywords.service';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';
import { CreateSpotKeywordDto } from '../../dto/create-spot-keyword.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';

@ApiTags('spot-keywords')
@ApiBearerAuth()
@Controller('spot-keywords')
@UseGuards(RolesGuard)
export class SpotKeywordsController {
  private readonly logger = new Logger(SpotKeywordsController.name);

  constructor(private readonly spotKeywordsService: SpotKeywordsService) {}

  @Get('suggest')
  @ApiOperation({ summary: 'Suggest spot keywords by name prefix (authenticated users)' })
  public async suggest(
    @Query('q') q: string,
    @Query('limit') limitRaw?: string,
  ): Promise<SpotKeyword[]> {
    this.logger.log('GET /spot-keywords/suggest');
    if (q === undefined || q === null || String(q).trim().length === 0) {
      throw new BadRequestException('Query parameter q is required');
    }
    const limit = limitRaw !== undefined ? Number.parseInt(String(limitRaw), 10) : 20;
    if (Number.isNaN(limit)) {
      throw new BadRequestException('limit must be a number');
    }
    return this.spotKeywordsService.suggestByPrefix(String(q), limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get spot keyword by Firestore document id (authenticated users)' })
  public async getById(@Param('id') id: string): Promise<SpotKeyword> {
    this.logger.log(`GET /spot-keywords/${id}`);
    const keyword = await this.spotKeywordsService.findById(id);
    if (!keyword) {
      throw new NotFoundException(`Spot keyword not found: ${id}`);
    }
    return keyword;
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a spot keyword (admin)' })
  public async create(@Body() dto: CreateSpotKeywordDto): Promise<SpotKeyword> {
    this.logger.log('POST /spot-keywords');
    return this.spotKeywordsService.create(dto);
  }
}
