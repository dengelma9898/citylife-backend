import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChristmasMarketsService } from './christmas-markets.service';
import { CreateChristmasMarketDto } from './dto/create-christmas-market.dto';
import { UpdateChristmasMarketDto } from './dto/update-christmas-market.dto';
import { ChristmasMarket } from './interfaces/christmas-market.interface';
import { RolesGuard } from '../core/guards/roles.guard';
import { Roles } from '../core/decorators/roles.decorator';
import { CurrentUser } from '../core/decorators/current-user.decorator';

@ApiTags('christmas-markets')
@ApiBearerAuth()
@Controller('christmas-markets')
@UseGuards(RolesGuard)
export class ChristmasMarketsController {
  private readonly logger = new Logger(ChristmasMarketsController.name);

  constructor(private readonly christmasMarketsService: ChristmasMarketsService) {}

  @Get()
  @ApiOperation({
    summary: 'Alle Weihnachtsmärkte, sortiert nach Startdatum (ohne Datum ans Ende)',
  })
  @ApiResponse({ status: 200, description: 'Liste aller Weihnachtsmärkte' })
  public async findAll(): Promise<ChristmasMarket[]> {
    this.logger.log('GET /christmas-markets');
    return this.christmasMarketsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Einen Weihnachtsmarkt abrufen' })
  @ApiResponse({ status: 200, description: 'Der angeforderte Weihnachtsmarkt' })
  @ApiResponse({ status: 404, description: 'Weihnachtsmarkt nicht gefunden' })
  public async findOne(@Param('id') id: string): Promise<ChristmasMarket> {
    this.logger.log(`GET /christmas-markets/${id}`);
    return this.christmasMarketsService.findOne(id);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Weihnachtsmarkt anlegen (Admin)' })
  @ApiResponse({ status: 201, description: 'Weihnachtsmarkt angelegt' })
  public async create(
    @Body() dto: CreateChristmasMarketDto,
    @CurrentUser() userId: string,
  ): Promise<ChristmasMarket> {
    this.logger.log('POST /christmas-markets');
    return this.christmasMarketsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Weihnachtsmarkt teilaktualisieren (Admin)' })
  @ApiResponse({ status: 200, description: 'Weihnachtsmarkt aktualisiert' })
  @ApiResponse({ status: 404, description: 'Weihnachtsmarkt nicht gefunden' })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateChristmasMarketDto,
    @CurrentUser() userId: string,
  ): Promise<ChristmasMarket> {
    this.logger.log(`PATCH /christmas-markets/${id}`);
    return this.christmasMarketsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Weihnachtsmarkt löschen (Admin)' })
  @ApiResponse({ status: 200, description: 'Weihnachtsmarkt gelöscht' })
  @ApiResponse({ status: 404, description: 'Weihnachtsmarkt nicht gefunden' })
  public async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /christmas-markets/${id}`);
    return this.christmasMarketsService.remove(id);
  }
}
